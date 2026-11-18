// src/mock/pcService.js
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const data = {
  "Block 5": {
    "Lab A": {
      "Room 522": [
        { id: "522-A-01", pcNumber: 1, displayCode: "522/A/01" },
        { id: "522-A-02", pcNumber: 2, displayCode: "522/A/02" },
        { id: "522-A-12", pcNumber: 12, displayCode: "522/A/12" },
      ],
      "Room 523": [
        { id: "523-A-01", pcNumber: 1, displayCode: "523/A/01" },
        { id: "523-A-02", pcNumber: 2, displayCode: "523/A/02" },
      ],
    },
    "Lab B": {
      "Room 523": [
        { id: "523-B-07", pcNumber: 7, displayCode: "523/B/07" },
        { id: "523-B-08", pcNumber: 8, displayCode: "523/B/08" },
      ],
    },
  },
  "Block 6": {
    "Lab C": {
      "Room 525": [
        { id: "525-C-03", pcNumber: 3, displayCode: "525/C/03" },
        { id: "525-C-04", pcNumber: 4, displayCode: "525/C/04" },
      ],
    },
  },
};

export const mockPcService = {
  async getBlocks() {
    await delay();
    return Object.keys(data);
  },

  async getLabs(block) {
    await delay();
    return Object.keys(data[block] || {});
  },

  // SelectPC only passes the lab name, so search every block for it
  async getRooms(lab) {
    await delay();
    const rooms = new Set();
    Object.values(data).forEach((labs) => {
      if (labs[lab]) Object.keys(labs[lab]).forEach((r) => rooms.add(r));
    });
    return [...rooms];
  },

  // SelectPC only passes the room name, so search every lab for it
  async getPcs(room) {
    await delay();
    const result = [];
    Object.values(data).forEach((labs) => {
      Object.values(labs).forEach((rooms) => {
        if (rooms[room]) result.push(...rooms[room]);
      });
    });
    return result;
  },
};