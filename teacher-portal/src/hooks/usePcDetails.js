// src/hooks/usePcDetails.js
// Loads the latest PC details and its active tickets from the backend.
import { useApi } from './useApi';
import { pcService } from '../services/pcService';

export function usePcDetails(pcId) {
  const pc = useApi(() => pcService.getPc(pcId), [pcId], { enabled: !!pcId });
  const tickets = useApi(() => pcService.getActiveTickets(pcId), [pcId], { enabled: !!pcId });
  return { pc, tickets };
}
