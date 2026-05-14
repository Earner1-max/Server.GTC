export class StateManager {
  constructor(kv) {
    this.kv = kv;
  }

  async getStep(userId) {
    const val = await this.kv.get(`step:${userId}`);
    return val || null;
  }

  async setStep(userId, step) {
    await this.kv.put(`step:${userId}`, step, { expirationTtl: 3600 });
  }

  async clearStep(userId) {
    await this.kv.delete(`step:${userId}`);
  }

  async getUserData(userId) {
    const val = await this.kv.get(`data:${userId}`, "json");
    return val || {};
  }

  async setUserData(userId, data) {
    await this.kv.put(`data:${userId}`, JSON.stringify(data), { expirationTtl: 3600 });
  }

  async clearUserData(userId) {
    await this.kv.delete(`data:${userId}`);
  }

  async set(userId, key, value) {
    const data = await this.getUserData(userId);
    data[key] = value;
    await this.setUserData(userId, data);
  }

  async get(userId, key) {
    const data = await this.getUserData(userId);
    return data[key];
  }

  async remove(userId, key) {
    const data = await this.getUserData(userId);
    delete data[key];
    await this.setUserData(userId, data);
  }
}
