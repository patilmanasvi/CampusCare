// src/services/pcService.js
// PC inventory is owned by the backend / admin dashboard. The teacher portal
// only reads it, so admin changes show up automatically.
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockPcService } from '../mock/pcService';

const unwrap = (data) => data?.items ?? data;

const realPcService = {
  async lookupByQrToken(token) {
    const { data } = await api.get(ENDPOINTS.pcs.lookupByQrToken(token));
    return data?.pc ?? data;
  },
  async getBlocks() {
    const { data } = await api.get(ENDPOINTS.pcs.blocks);
    return unwrap(data);
  },
  async getRooms(blockId) {
    const { data } = await api.get(ENDPOINTS.pcs.rooms(blockId));
    return unwrap(data);
  },
  async getPcs(roomId) {
    const { data } = await api.get(ENDPOINTS.pcs.pcsInRoom(roomId));
    return unwrap(data);
  },
  async getPc(pcId) {
    const { data } = await api.get(ENDPOINTS.pcs.detail(pcId));
    return data?.pc ?? data;
  },
  async getActiveTickets(pcId) {
    const { data } = await api.get(ENDPOINTS.pcs.activeTickets(pcId));
    return unwrap(data);
  },
};

export const pcService = USE_MOCK_API ? mockPcService : realPcService;
