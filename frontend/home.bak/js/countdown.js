function countdown() {
    const days = document.querySelector(".countdown .days .value");
    const hours = document.querySelector(".countdown .hours .value");
    const minutes = document.querySelector(".countdown .minutes .value");
    const seconds = document.querySelector(".countdown .seconds .value");
  
    const now = new Date();
    const countdownDate = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000);
  
    const daysLeft = countdownDate.getDate() - now.getDate();
    const hoursLeft = countdownDate.getHours() - now.getHours();
    const minutesLeft = countdownDate.getMinutes() - now.getMinutes();
    const secondsLeft = countdownDate.getSeconds() - now.getSeconds();
  
    days.textContent = daysLeft;
    hours.textContent = hoursLeft;
    minutes.textContent = minutesLeft;
    seconds.textContent = secondsLeft;
  
    if (daysLeft === 0 && hoursLeft === 0 && minutesLeft === 0 && secondsLeft === 0) {
      window.location.href = "https://example.com";
    }
  
    setTimeout(countdown, 1000);
  }
  
  window.onload = countdown;