import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getStatisticsCid, reportStatisticsEnter, reportStatisticsExit, sendStatisticsExitBeacon } from '../services/adminApi';

function buildPath(location) {
  return location.pathname || '/';
}

export default function StatisticsTracker() {
  const location = useLocation();
  const activeVisitRef = useRef(null);
  const cidRef = useRef(getStatisticsCid());

  useEffect(() => {
    let cancelled = false;

    const enterNextPage = async () => {
      const nextPath = buildPath(location);
      const previousVisit = activeVisitRef.current;

      if (previousVisit) {
        const duration = Math.max(0, Math.round((Date.now() - previousVisit.enteredAt) / 1000));
        try {
          await reportStatisticsExit({
            visitId: previousVisit.visitId,
            cid: cidRef.current,
            path: previousVisit.path,
            exitTime: new Date().toISOString(),
            duration,
          });
        } catch {
        }
      }

      try {
        const result = await reportStatisticsEnter({
          cid: cidRef.current,
          path: nextPath,
          referer: previousVisit?.path || document.referrer || '',
          enterTime: new Date().toISOString(),
        });

        if (!cancelled) {
          activeVisitRef.current = {
            visitId: result.visitId,
            path: nextPath,
            enteredAt: Date.now(),
          };
        }
      } catch {
      }
    };

    enterNextPage();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    const handlePageHide = () => {
      const current = activeVisitRef.current;
      if (!current) {
        return;
      }

      const duration = Math.max(0, Math.round((Date.now() - current.enteredAt) / 1000));
      sendStatisticsExitBeacon({
        visitId: current.visitId,
        cid: cidRef.current,
        path: current.path,
        exitTime: new Date().toISOString(),
        duration,
      });
      activeVisitRef.current = null;
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null;
}