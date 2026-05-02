Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Show-Usage {
  Write-Host 'Usage: build.bat [--output target_dir] [--artifact backend,frontend,conf] [--keeptmpfile]'
}

function Resolve-AbsolutePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$BasePath
  )

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Get-RelativePathCompat {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BasePath,
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  $normalizedBase = $BasePath.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
  $baseUri = New-Object System.Uri($normalizedBase)
  $targetUri = New-Object System.Uri($TargetPath)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Parse-Artifacts {
  param([string]$ArtifactsCsv)

  $allowed = @('backend', 'frontend', 'conf')
  $artifacts = @()

  foreach ($item in ($ArtifactsCsv -split ',')) {
    $artifact = $item.Trim().ToLowerInvariant()
    if (-not $artifact) {
      continue
    }
    if ($allowed -notcontains $artifact) {
      throw "Unsupported artifact '$artifact'. Allowed values: $($allowed -join ', ')"
    }
    if ($artifacts -notcontains $artifact) {
      $artifacts += $artifact
    }
  }

  if ($artifacts.Count -eq 0) {
    throw 'At least one artifact must be selected.'
  }

  return $artifacts
}

function Get-BackendIgnoreRules {
  param([string]$IgnoreFile)

  if (-not (Test-Path -LiteralPath $IgnoreFile)) {
    return @()
  }

  $rules = @()
  foreach ($line in Get-Content -LiteralPath $IgnoreFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('!')) {
      continue
    }

    $normalized = $trimmed.Replace('\', '/')
    $rules += [pscustomobject]@{
      Pattern = $normalized
      Name = $normalized.TrimEnd('/')
      IsDirectory = $normalized.EndsWith('/')
      HasSlash = $normalized.Contains('/')
    }
  }

  return $rules
}

function Test-BackendIgnored {
  param(
    [string]$RelativePath,
    [System.Collections.IEnumerable]$Rules
  )

  $normalizedPath = $RelativePath.Replace('\', '/')
  $segments = $normalizedPath -split '/'
  $leaf = Split-Path -Path $normalizedPath -Leaf

  foreach ($rule in $Rules) {
    if ($rule.IsDirectory) {
      $name = $rule.Name
      if ($rule.HasSlash) {
        if ($normalizedPath -eq $name -or $normalizedPath.StartsWith("$name/")) {
          return $true
        }
      } elseif ($segments -contains $name) {
        return $true
      }
      continue
    }

    if ($rule.HasSlash) {
      if ($normalizedPath -like $rule.Pattern -or $normalizedPath -eq $rule.Pattern) {
        return $true
      }
      continue
    }

    if ($leaf -like $rule.Pattern -or $normalizedPath -eq $rule.Pattern) {
      return $true
    }
  }

  return $false
}

function Copy-DirectoryContents {
  param(
    [string]$SourceDir,
    [string]$DestinationDir
  )

  New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
  $items = Get-ChildItem -LiteralPath $SourceDir -Force
  foreach ($item in $items) {
    Copy-Item -LiteralPath $item.FullName -Destination $DestinationDir -Recurse -Force
  }
}

function Copy-BackendArtifact {
  param(
    [string]$RepoRoot,
    [string]$DestinationDir
  )

  $backendRoot = Join-Path $RepoRoot 'backend'
  $ignoreFile = Join-Path $backendRoot '.gitignore'

  New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null

  $gitCmd = Get-Command git -ErrorAction SilentlyContinue
  $gitDir = Join-Path $RepoRoot '.git'
  if ($gitCmd -and (Test-Path -LiteralPath $gitDir)) {
    $gitFiles = & $gitCmd.Source -C $RepoRoot ls-files --cached --others --exclude-standard --full-name -- backend
    if ($LASTEXITCODE -eq 0) {
      foreach ($path in $gitFiles) {
        if (-not $path.StartsWith('backend/')) {
          continue
        }

        $relative = $path.Substring('backend/'.Length).Replace('/', '\')
        if (-not $relative) {
          continue
        }

        $source = Join-Path $RepoRoot $path
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
          continue
        }

        $destination = Join-Path $DestinationDir $relative
        $destinationParent = Split-Path -Path $destination -Parent
        if ($destinationParent) {
          New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
        }
        Copy-Item -LiteralPath $source -Destination $destination -Force
      }
      return
    }
  }

  $rules = Get-BackendIgnoreRules -IgnoreFile $ignoreFile
  $files = Get-ChildItem -LiteralPath $backendRoot -Recurse -Force -File
  foreach ($file in $files) {
    $relative = Get-RelativePathCompat -BasePath $backendRoot -TargetPath $file.FullName
    if (Test-BackendIgnored -RelativePath $relative -Rules $rules) {
      continue
    }

    $destination = Join-Path $DestinationDir $relative
    $destinationParent = Split-Path -Path $destination -Parent
    if ($destinationParent) {
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  }
}

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..'))
$currentDir = (Get-Location).Path

$outputRoot = Join-Path $repoRoot 'tmp\build'
$artifactsCsv = 'backend,frontend,conf'
$keepTmpFile = $false

for ($index = 0; $index -lt $args.Count; $index += 1) {
  $argument = [string]$args[$index]
  switch ($argument) {
    '--output' {
      if ($index + 1 -ge $args.Count) {
        throw 'Missing value for --output'
      }
      $index += 1
      $outputRoot = Resolve-AbsolutePath -Path ([string]$args[$index]) -BasePath $currentDir
    }
    '--artifact' {
      if ($index + 1 -ge $args.Count) {
        throw 'Missing value for --artifact'
      }
      $index += 1
      $artifactsCsv = [string]$args[$index]
    }
    '--keeptmpfile' {
      $keepTmpFile = $true
    }
    '--help' {
      Show-Usage
      exit 0
    }
    default {
      throw "Unknown argument: $argument"
    }
  }
}

$artifacts = Parse-Artifacts -ArtifactsCsv $artifactsCsv
$tmpRoot = Join-Path $outputRoot 'target'
$archivePath = Join-Path $outputRoot 'build.tar.gz'
$frontendRoot = Join-Path $repoRoot 'frontend'
$frontendDist = Join-Path $frontendRoot 'dist'
$confRoot = Join-Path $repoRoot 'conf'
$installScript = Join-Path $scriptDir 'install.sh'

if (-not (Test-Path -LiteralPath $installScript)) {
  throw "install.sh not found at $installScript"
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null

try {
  if ($artifacts -contains 'frontend') {
    Write-Host 'Building frontend...'
    Push-Location $frontendRoot
    try {
      & npm run build
      if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
      }
    } finally {
      Pop-Location
    }

    if (-not (Test-Path -LiteralPath $frontendDist)) {
      throw 'frontend/dist was not generated.'
    }

    Copy-DirectoryContents -SourceDir $frontendDist -DestinationDir (Join-Path $tmpRoot 'frontend')
  }

  if ($artifacts -contains 'backend') {
    Write-Host 'Copying backend...'
    Copy-BackendArtifact -RepoRoot $repoRoot -DestinationDir (Join-Path $tmpRoot 'backend')
  }

  if ($artifacts -contains 'conf') {
    Write-Host 'Copying conf...'
    Copy-DirectoryContents -SourceDir $confRoot -DestinationDir (Join-Path $tmpRoot 'conf')
  }

  Copy-Item -LiteralPath $installScript -Destination (Join-Path $tmpRoot 'install.sh') -Force

  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }

  $tarCmd = Get-Command tar.exe -ErrorAction SilentlyContinue
  if (-not $tarCmd) {
    $tarCmd = Get-Command tar -ErrorAction SilentlyContinue
  }
  if (-not $tarCmd) {
    throw 'tar is required to create build.tar.gz on Windows.'
  }

  Write-Host 'Creating build.tar.gz...'
  & $tarCmd.Source -czf $archivePath -C $tmpRoot .
  if ($LASTEXITCODE -ne 0) {
    throw "tar failed with exit code $LASTEXITCODE"
  }

  if (-not $keepTmpFile) {
    Remove-Item -LiteralPath $tmpRoot -Recurse -Force
  }

  Write-Host "Build completed: $archivePath"
} catch {
  Write-Error $_
  exit 1
}