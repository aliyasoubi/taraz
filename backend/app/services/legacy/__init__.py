"""One-time conversion of the practice's old Excel workbook into the standard workbook.

The old workbook kept one sheet per month (patient, balance after the visit,
payment, date, "bank-account", notes), an orthodontics sheet, and a debtors list.
Treatment costs were never written down; they are rebuilt from how the balance
moves. Every guess is recorded as an `Issue` for review.
"""
