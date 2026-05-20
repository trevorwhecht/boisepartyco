export const projectConfig = {
  businessName: "Boise Party Co",
  businessDescription: "Party rentals & event supplies",
  taxRate: 0.06,   // 6% Idaho state rate
  currency: "USD",   // manual edit only

  orderStates: {
    awaitingPayment: true,   // "Awaiting Payment"
    inProgress: true,             // "In Progress"
    readyForPickup: true,     // "Ready for Pickup"
    paymentNeeded: true,       // "Payment Needed"
  },
} as const
