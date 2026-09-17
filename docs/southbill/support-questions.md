# Draft questions for SouthBill support — NOT SENT

We are integrating PulseAW LLC using the SouthBill Merchant API. We want a reusable payment link where
a customer enters an amount, followed by a detailed invoice for the actual contracted services.
Please confirm the following for our merchant account:

1. What is the supported Merchant API/UI procedure to provision a permanent customer-chosen-amount
   link? Can it enforce allowed totals/whole-dollar values, and which link ID is included in events?
2. How can each use of the link securely include a unique order/contract reference and consent evidence?
3. Which documented endpoint attaches an existing, captured SouthBill payment to a new detailed invoice
   without making a second charge or using mark_paid? Please provide request/response examples.
4. Does the link or payment partner already generate an invoice? How do we ensure exactly one
   authoritative invoice, with detailed items and the original payment recorded?
5. How do we deliver/view that settled invoice without /send reopening collection?
6. Is there a true merchant sandbox? Your webhook overview says live only and ping.test is synthetic.
7. Which merchant identity/partner fields can our API key retrieve for account binding? How should a
   webhook consumer confirm merchant and payment identity when the event envelope omits merchant_id?
8. Are Cash App Pay and the requested currencies available and approved specifically for PulseAW?
9. Are webhook endpoint registration and method settings available through the Merchant API? If so,
   please provide the documented routes and permission scopes.

We have not performed a real payment or issued an invoice for these integration tests.
