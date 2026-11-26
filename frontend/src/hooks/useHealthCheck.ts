import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { HealthStatus } from '../types';

export const useHealthCheck = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend unreachable');
      setHealth({ status: 'unhealthy' });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return { health, isChecking, error, refetch: checkHealth };
};
