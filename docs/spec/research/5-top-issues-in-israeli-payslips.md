Here are 5 clear-cut, high-impact issues you can programmatically detect from the data points on a standard Israeli *Tlush Maskoret* (payslip).

---

### 1. Missing or Inaccurate Tax Credit Points (Nekudot Zikui)

**Implementation note:** The analyzer implements a first pass of this check as the **Payslip Gaps** feature; see [docs/feature/payslip-gaps.md](../feature/payslip-gaps.md).

**What is the issue:**
In Israel, income tax is offset by "Nekudot Zikui" (tax credit points). Every resident is automatically entitled to a baseline number of points (2.25 for men, 2.75 for women), with each point worth 242 NIS per month (as of 2026). Employees accrue extra points for various life situations: having children, completing an academic degree, being a discharged soldier, or living in specific geographic zones. Very often, employees forget to submit an updated Form 101 at the start of the year, or HR misses the update, resulting in points reverting to zero or the baseline.

**What to look for in the pay slip:**

Look at the personal details header section at the top of the slip. Find the field labeled **נקודות זיכוי** (Nekudot Zikui). If a male employee has 0, or if you know the employee is a mother of young children but the slip only shows the baseline 2.75, there is a definitive error.

**The impact on the employee:**
The employee is needlessly overpaying **מס הכנסה** (Mas Hachnasa / Income Tax) by hundreds or thousands of shekels every single month. This directly and drastically reduces their net take-home pay. While it can be retroactively claimed, the employee is essentially giving the government an interest-free loan.

---

### 2. Incorrect Pension Contribution Ratios (Mandatory Minimums)

**Implementation note:** The analyzer implements employer **tagmulim** (6.5%) and employee pension (6%) vs **pensionable salary** as **Payslip Gap 2**; see [docs/feature/pension-contribution-ratios.md](../feature/pension-contribution-ratios.md) and [docs/feature/payslip-gaps.md](../feature/payslip-gaps.md). Employer **pitzuyim** (6%) is not checked in v1.

**What is the issue:**
By law, employers in Israel must contribute a minimum percentage to an employee's pension fund. The statutory minimums are 6.5% for the employer's pension contribution (Tagmulim), 6% for the employer's severance contribution (Pitzuyim, usually governed under Section 14), and a 6% deduction from the employee. Some employers illegally cap the salary baseline used for this calculation below the actual gross salary, or fail to meet the 6.5% threshold.

**What to look for in the pay slip:**

Look at the deductions section (ניכויים) and the employer contributions section (הפרשות מעסיק / קופות גמל). Find the rows for **פנסיה** (Pension) or **תגמולים** (Tagmulim). Calculate the ratio: take the monetary amount contributed by the employer and divide it by the base pensionable salary (שכר פנסיוני / שכר יסוד). If the result is less than 6.5%, or if the employee's internal deduction is less than 6%, a warning should be triggered.

**The impact on the employee:**
The employee is losing out on critical, compounding long-term retirement savings. Furthermore, because the 6.5% employer contribution includes the premium for disability insurance (loss of work capacity), underpaying this component puts the employee at severe financial risk if they are injured and unable to work.

---

### 3. Minimum Wage & Hourly Divisor Errors (The "186 vs. 182" Trap)

**What is the issue:**
In recent years, Israel shortened the legal standard workweek. Consequently, the divisor used to calculate an hourly rate from a global monthly salary dropped from 186 hours down to 182 hours (and in some sectors, like the public sector, even lower to 173.33 hours). Additionally, the minimum wage is periodically updated (rising to roughly 6,443.85 NIS / 35.4 NIS per hour in April 2026). Many outdated payroll systems or negligent employers still divide the base salary by 186.

**What to look for in the pay slip:**
Look at the **שכר יסוד** (Base Salary) and the **תעריף שעתי** (Hourly Rate) or **שעות עבודה** (Work Hours) fields. Divide the Base Salary by the Hourly Rate. If the result is exactly 186, the payroll system is using an illegal, outdated divisor. Also, check if the Hourly Rate drops below the current legal minimum wage.

**The impact on the employee:**
The employee's hourly worth is being artificially diluted. This means they are systematically underpaid for every single hour of overtime (Sha'ot Nosafot), holiday pay, and sick leave, which are all calculated based on that base hourly rate.

---

### 4. Unpaid or Ignored Recuperation Pay (Dmei Havraa)

**What is the issue:**
Every employee in Israel who has worked for a single employer for at least one full year is legally entitled to "Recuperation Pay." The number of days increases with seniority (starting at 5 days for the first year). It must be paid either as a yearly lump sum (usually in the summer months of June–August) or pro-rated evenly into the monthly salary. 

**What to look for in the pay slip:**
First, check the **ותק** (Vetek / Seniority) field at the top of the payslip. If the seniority is greater than 1.00 (meaning more than one year), look in the gross income components for a line item called **דמי הבראה** (Dmei Havraa). If a full 12 months have passed and there is no trace of this payment historically in the summer months or pro-rated currently, it is a massive red flag.

**The impact on the employee:**
The employee is losing a statutory, guaranteed bonus. At current rates (approx. 418 NIS per day in the private sector), a first-year employee who misses this payment is being shortchanged at least 2,090 NIS.

---

### 5. Travel Allowance (Dmei Nesiya) Omissions

**What is the issue:**
Employers are obligated to reimburse employees for their commute, up to a maximum daily rate (around 22.60 NIS) or the cost of a monthly transit pass (Hofshi Hodshi), whichever is cheaper. Unless explicitly stated in a legally binding contract clause that travel is absorbed into a "Global" salary, it must appear as a distinct payment. 

**What to look for in the pay slip:**
Look at the gross additions section for **נסיעות** (Nesiut) or **החזר הוצאות נסיעה** (Travel Expense Reimbursement). If this line item is entirely missing, or if the amount is suspiciously low compared to the number of days worked (ימי עבודה) multiplied by the standard daily transit rate, it requires immediate review.

**The impact on the employee:**
The employee is effectively taking a pay cut to fund their own commute, losing out on untaxed or standard reimbursable income that Israeli labor law guarantees them.