export class DB {
  constructor(d1) {
    this.d1 = d1;
  }

  async getSetting(key) {
    const row = await this.d1.prepare("SELECT value FROM settings WHERE key=?").bind(key).first();
    return row ? row.value : null;
  }

  async setSetting(key, value) {
    await this.d1.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)").bind(key, String(value)).run();
  }

  async getUser(userId) {
    const row = await this.d1.prepare("SELECT * FROM users WHERE user_id=?").bind(userId).first();
    return row || null;
  }

  async createUser(userId, username, fullName, referredBy = null) {
    await this.d1.prepare(
      "INSERT OR IGNORE INTO users (user_id,username,full_name,referred_by) VALUES (?,?,?,?)"
    ).bind(userId, username, fullName, referredBy).run();
  }

  async updateUser(userId, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const sets = keys.map(k => `${k}=?`).join(", ");
    const vals = [...Object.values(fields), userId];
    await this.d1.prepare(`UPDATE users SET ${sets} WHERE user_id=?`).bind(...vals).run();
  }

  async addBalance(userId, amount) {
    await this.d1.prepare("UPDATE users SET balance=balance+? WHERE user_id=?").bind(amount, userId).run();
  }

  async deductBalance(userId, amount) {
    await this.d1.prepare("UPDATE users SET balance=MAX(0,balance-?) WHERE user_id=?").bind(amount, userId).run();
  }

  async getAllUsers() {
    const { results } = await this.d1.prepare("SELECT user_id FROM users").all();
    return results.map(r => r.user_id);
  }

  async createTgeRequest(userId, oxapayTrack = null) {
    await this.d1.prepare("INSERT INTO tge_requests (user_id,oxapay_track) VALUES (?,?)").bind(userId, oxapayTrack).run();
  }

  async getTgeRequestById(reqId) {
    return await this.d1.prepare("SELECT * FROM tge_requests WHERE id=?").bind(reqId).first();
  }

  async getPendingTgeRequests() {
    const { results } = await this.d1.prepare(
      "SELECT t.*,u.username,u.full_name,u.balance FROM tge_requests t " +
      "JOIN users u ON t.user_id=u.user_id WHERE t.status='pending' ORDER BY t.created_at"
    ).all();
    return results;
  }

  async updateTgeRequest(reqId, status) {
    await this.d1.prepare("UPDATE tge_requests SET status=?,reviewed_at=? WHERE id=?")
      .bind(status, Math.floor(Date.now() / 1000), reqId).run();
  }

  async getUserTgeRequest(userId) {
    return await this.d1.prepare(
      "SELECT * FROM tge_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 1"
    ).bind(userId).first();
  }

  async createPresaleRequest(userId, txHash = null, oxapayTrack = null) {
    await this.d1.prepare(
      "INSERT INTO presale_requests (user_id,tx_hash,oxapay_track) VALUES (?,?,?)"
    ).bind(userId, txHash, oxapayTrack).run();
  }

  async getPresaleRequestById(reqId) {
    return await this.d1.prepare("SELECT * FROM presale_requests WHERE id=?").bind(reqId).first();
  }

  async getPendingPresaleRequests() {
    const { results } = await this.d1.prepare(
      "SELECT p.*,u.username,u.full_name FROM presale_requests p " +
      "JOIN users u ON p.user_id=u.user_id WHERE p.status='pending' ORDER BY p.created_at"
    ).all();
    return results;
  }

  async updatePresaleRequest(reqId, status) {
    await this.d1.prepare("UPDATE presale_requests SET status=?,reviewed_at=? WHERE id=?")
      .bind(status, Math.floor(Date.now() / 1000), reqId).run();
  }

  async getUserPresaleRequest(userId) {
    return await this.d1.prepare(
      "SELECT * FROM presale_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 1"
    ).bind(userId).first();
  }

  async updatePresaleRequestHash(reqId, txHash) {
    await this.d1.prepare("UPDATE presale_requests SET tx_hash=? WHERE id=?").bind(txHash, reqId).run();
  }

  async createWithdrawal(userId, type, amountGtc, amountUsdt, bnbAddress) {
    await this.d1.prepare(
      "INSERT INTO withdrawals (user_id,type,amount_gtc,amount_usdt,bnb_address) VALUES (?,?,?,?,?)"
    ).bind(userId, type, amountGtc, amountUsdt, bnbAddress).run();
  }

  async getPendingWithdrawals() {
    const { results } = await this.d1.prepare(
      "SELECT w.*,u.username,u.full_name FROM withdrawals w " +
      "JOIN users u ON w.user_id=u.user_id WHERE w.status='pending' ORDER BY w.created_at"
    ).all();
    return results;
  }

  async updateWithdrawal(reqId, status) {
    await this.d1.prepare("UPDATE withdrawals SET status=?,reviewed_at=? WHERE id=?")
      .bind(status, Math.floor(Date.now() / 1000), reqId).run();
  }

  async getWithdrawalById(reqId) {
    return await this.d1.prepare("SELECT * FROM withdrawals WHERE id=?").bind(reqId).first();
  }

  async saveScreenshot(userId, fileId) {
    await this.d1.prepare(
      "INSERT OR REPLACE INTO comment_verifications (user_id,screenshot_file_id,submitted_at) VALUES (?,?,?)"
    ).bind(userId, fileId, Math.floor(Date.now() / 1000)).run();
  }

  async getDistributionStats() {
    const now = Math.floor(Date.now() / 1000);
    const [totalBalance, totalUsers, verified, tgeUsers, presaleUsers, presaleRewarded, mineToday, pendingWd] =
      await Promise.all([
        this.d1.prepare("SELECT COALESCE(SUM(balance),0) AS s FROM users").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM users").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM users WHERE verified=1").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM users WHERE tge_joined=1").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM users WHERE presale_joined=1").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM presale_requests WHERE status='approved'").first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM users WHERE last_mine>=?").bind(now - 86400).first(),
        this.d1.prepare("SELECT COUNT(*) AS c FROM withdrawals WHERE status='pending'").first(),
      ]);
    return {
      total_balance:    totalBalance.s,
      total_users:      totalUsers.c,
      verified:         verified.c,
      tge_users:        tgeUsers.c,
      presale_users:    presaleUsers.c,
      presale_rewarded: presaleRewarded.c,
      mine_today:       mineToday.c,
      pending_wd:       pendingWd.c,
    };
  }
}
