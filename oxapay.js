import { OXAPAY_BASE_URL } from "./config.js";

export async function createInvoice(apiKey, amountUsdt, orderId, callbackUrl = "") {
  const payload = {
    merchant: apiKey,
    amount: amountUsdt,
    currency: "USDT",
    lifeTime: 30,
    feePaidByPayer: 1,
    underPaidCover: 2.5,
    callbackUrl: callbackUrl,
    returnUrl: "",
    description: `GTC Presale Payment - Order ${orderId}`,
    orderId: orderId,
  };
  try {
    const resp = await fetch(`${OXAPAY_BASE_URL}/merchants/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.result === 100) return { success: true, data };
    return { success: false, error: data.message || "Unknown error" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function verifyPayment(apiKey, trackId) {
  const payload = { merchant: apiKey, trackId };
  try {
    const resp = await fetch(`${OXAPAY_BASE_URL}/merchants/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.result === 100) {
      const status = data.status || "";
      return { success: true, paid: status === "Paid", status, data };
    }
    return { success: false, error: data.message || "Unknown error" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function verifyByHash(apiKey, txHash) {
  const payload = { merchant: apiKey, txHash };
  try {
    const resp = await fetch(`${OXAPAY_BASE_URL}/merchants/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.result === 100) {
      return { success: true, paid: data.status === "Paid", data };
    }
    return { success: false, error: data.message || "Unknown error" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
