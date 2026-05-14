CREATE TABLE IF NOT EXISTS users (
    user_id            INTEGER PRIMARY KEY,
    username           TEXT    DEFAULT '',
    full_name          TEXT    DEFAULT '',
    balance            REAL    DEFAULT 0,
    referred_by        INTEGER DEFAULT NULL,
    referral_count     INTEGER DEFAULT 0,
    joined_at          INTEGER DEFAULT (strftime('%s','now')),
    verified           INTEGER DEFAULT 0,
    tge_joined         INTEGER DEFAULT 0,
    presale_joined     INTEGER DEFAULT 0,
    last_mine          INTEGER DEFAULT 0,
    withdrawal_percent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS tge_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    oxapay_track TEXT,
    status       TEXT    DEFAULT 'pending',
    created_at   INTEGER DEFAULT (strftime('%s','now')),
    reviewed_at  INTEGER DEFAULT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS presale_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    tx_hash      TEXT,
    oxapay_track TEXT,
    status       TEXT    DEFAULT 'pending',
    created_at   INTEGER DEFAULT (strftime('%s','now')),
    reviewed_at  INTEGER DEFAULT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    type        TEXT    NOT NULL,
    amount_gtc  REAL    NOT NULL,
    amount_usdt REAL    NOT NULL,
    bnb_address TEXT    NOT NULL,
    status      TEXT    DEFAULT 'pending',
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    reviewed_at INTEGER DEFAULT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS comment_verifications (
    user_id            INTEGER PRIMARY KEY,
    screenshot_file_id TEXT,
    submitted_at       INTEGER DEFAULT (strftime('%s','now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('refer_amount',     '50');
INSERT OR IGNORE INTO settings (key, value) VALUES ('mine_amount',      '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('mine_cooldown',    '86400');
INSERT OR IGNORE INTO settings (key, value) VALUES ('min_withdrawal',   '1000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('comment_post_url', 'https://x.com/i/status/2053857757900541991');
