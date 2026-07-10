import React from "react";
import { Btn } from "../ui/atoms";
import { peso } from "../data";
import gcashQrImage from "../assets/gcash-qr.jpg";

export function GcashBillingSection({ me, onPay }) {
  const displayAmount = me.paymentStatus === "Paid" ? 0 : me.totalDue;
  const isPaid = me.paymentStatus === "Paid";

  return (
    <>
      {isPaid && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 mb-4">
          <div className="font-semibold mb-1">Payment completed</div>
          <div>Your payment was received via GCash. Thank you for staying current.</div>
        </div>
      )}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 text-[13px] font-semibold text-slate-700">Pay your bill — {peso(displayAmount)}</div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="p-4 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-500 mb-2">Pay in-app</div>
            <p className="text-[11px] text-slate-500 mb-3">{isPaid ? "No pending balance." : "Pay directly through your GCash account linked to this portal."}</p>
            <button
              onClick={() => onPay(me.id)}
              disabled={isPaid}
              className={`mt-auto w-full flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-lg transition ${
                isPaid
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-[#0072CE] hover:bg-[#005ea3] text-white"
              }`}
            >
              <span className={`rounded px-1.5 py-0.5 text-xs font-extrabold ${isPaid ? "bg-slate-400 text-slate-500" : "bg-white text-[#0072CE]"}`}>G</span>
              {isPaid ? "No payment due" : `Pay ${peso(displayAmount)} with GCash`}
            </button>
          </div>

          <div className="p-4 flex flex-col items-center text-center">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 self-start">Or scan to pay</div>
            <div className="p-2 border border-slate-200 rounded-lg">
              <img src={gcashQrImage} alt="GCash payment QR code" width={132} height={132} className="rounded" />
            </div>
            {!isPaid && (
              <div className="mt-2 text-[11px] text-slate-500">
                Amount to pay
                <div className="text-lg font-bold text-slate-800 leading-tight">{peso(displayAmount)}</div>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-semibold text-slate-600">GCash QR</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{isPaid ? "Payment already received." : "Open the GCash app and scan this code to pay."}</p>
          </div>
        </div>
      </div>
    </>
  );
}
