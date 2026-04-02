You should read the @docs/project.md file to get up to speed on the project.

Then, next up for us is to work on a new feature for which we likely need to do some refactoring in the code.

## Base capability
- We should still be collecting raw data points from the payslip
- We should not be visually annotating the payslip for all the raw data points. Each feature will define its own criteria of what to annotate (right now we annotate based on the mvp setup, so that needs to be removed and the new feature will define how annotation works)
- We should keep the strong schema based response for high fiedelity responses from the model

## New Feature: Payslip Gaps
In this feature we focus on surfacing issues that we may determine and drive from a single payslip document that are in contrast to what is expected (by law or by general standards in Israel payrol systems). These are clear-cut, high-impact issues you can programmatically detect from the data points on a standard Israeli *Tlush Maskoret* (payslip).

- Build a detection mechanism for these issues, based on the extracted raw data points from the payslip (if you need to update the payslip extracted data points, then do so, and document properly in the payslip gap those parent data points you need as requirements
- When you build this feature think about extension with good open/closed and other design patterns. Meaning, think of the payslip gaps feature as a plugin where we may now create just one payslip gap issue to detect but in the future we want to add more of them and we want do it without sticking all the code in one big file or one blob. We want to be able to easily extend.
- For each payslip gap you find you need to visually annotate it on the payslip (and at the end, the system should produce an annotated output of the payslip from the issues detected and from other features)
- Payslip gaps (issues) should be annotated in red color

### Payslip Gaps 1. Missing or Inaccurate Tax Credit Points (Nekudot Zikui)

**What is the issue:**
In Israel, income tax is offset by "Nekudot Zikui" (tax credit points). Every resident is automatically entitled to a baseline number of points (2.25 for men, 2.75 for women), with each point worth 242 NIS per month (as of 2026). Employees accrue extra points for various life situations: having children, completing an academic degree, being a discharged soldier, or living in specific geographic zones. Very often, employees forget to submit an updated Form 101 at the start of the year, or HR misses the update, resulting in points reverting to zero or the baseline.

**What to look for in the pay slip:**

Look at the personal details header section at the top of the slip. Find the field labeled **נקודות זיכוי** (Nekudot Zikui). If a male employee has 0, or if you know the employee is a mother of young children but the slip only shows the baseline 2.75, there is a definitive error.

**The impact on the employee:**
The employee is needlessly overpaying **מס הכנסה** (Mas Hachnasa / Income Tax) by hundreds or thousands of shekels every single month. This directly and drastically reduces their net take-home pay. While it can be retroactively claimed, the employee is essentially giving the government an interest-free loan.

## Guidelines 
- All the data points that you currently extract from the payslip should be still collected and printed out as console log output for debug and for general insights.
- You should document this feature in docs/feature/<FEATURE_NAME>.md - how it works, why it's needed, what is the value, what is the importance of it, etc.
- You should update any existing docs in @docs/ per the work we did here