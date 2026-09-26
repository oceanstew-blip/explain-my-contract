from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from pypdf import PdfReader
out=Path('output/pdf/client-test-pack')
cases=[('01-service-agreement','Fictional Marketing Services Agreement',[
'Parties: Cedar Studio LLC (Provider) and Harbor Bakery LLC (Client). Both parties and all terms are fictional.',
'1. Services. Provider will create four social posts per month. Two revision rounds per post are included. Additional work requires written agreement on scope and price.',
'2. Fees. Client pays $600 monthly, due on the first day of each month. No setup fee or late fee is specified.',
'3. Term. The initial term starts November 1, 2026 and ends January 31, 2027. It automatically renews for another three months unless either party gives written notice at least 30 days before the current term ends.',
'4. Termination. Either party may end the agreement for material breach if the breach remains uncorrected 10 days after written notice. No general early-cancellation right is stated.',
'5. Ownership. After full payment, Client owns the final approved posts. Provider keeps ownership of unused concepts and pre-existing templates.',
'6. Notices. Notice must be sent by email to the address designated by each party in writing. No actual email addresses are included in this fictional test.'
]),('02-residential-lease','Fictional Residential Lease',[
'Parties: Rowan Homes LLC (Landlord) and Jamie Example (Tenant). Fictional property: Unit A, Example Building. No real person or address is represented.',
'1. Term. The lease runs from November 1, 2026 through October 31, 2027. Tenant must give written notice at least 60 days before expiration to request renewal. Renewal is not automatic.',
'2. Money. Rent is $1,800 monthly, due on the first day. A refundable security deposit of $1,800 is due before move-in. A $50 late fee applies if rent remains unpaid after the fifth day.',
'3. Maintenance. Landlord is responsible for structural repairs. Tenant must report leaks promptly and keep the interior clean.',
'4. Subletting. Tenant must obtain Landlord’s written consent before subletting.',
'5. Damage. Tenant is responsible for damage caused by Tenant or guests, excluding ordinary wear. Landlord must provide an itemized statement of deductions.',
'6. Early termination. Tenant may end the lease with 30 days’ written notice and payment of a termination fee equal to one month’s rent.'
]),('03-coaching-agreement','Fictional Coaching Services Agreement',[
'Parties: Maple Coaching LLC (Coach) and Avery Example (Client). All details are fictional.',
'1. Program. Coach provides six private 60-minute sessions during a 12-week program starting November 2, 2026.',
'2. Fees. Client may pay $1,200 upfront or three monthly payments of $450. The installment total is $1,350.',
'3. Scheduling. Client must give at least 24 hours’ notice to reschedule. A missed session or a change with less notice counts as used.',
'4. Refunds. Fees are nonrefundable after the first session except where required by law. The agreement does not describe a refund when Coach cancels the entire program.',
'5. Results. Coach does not guarantee revenue, employment, or any particular result. Client is responsible for independent decisions.',
'6. Confidentiality. Both parties agree to keep session discussions confidential, except disclosure required by law.'
])]
def page(c,title,lines,num,total):
 c.setFillColorRGB(.04,.12,.32);c.setFont('Helvetica-Bold',17);c.drawString(48,744,title)
 c.setFont('Helvetica-Bold',9);c.drawString(48,722,'FICTIONAL TEST DOCUMENT - NOT FOR SIGNING OR LEGAL USE')
 y=690
 for para in lines:
  c.setFont('Helvetica',11)
  for line in simpleSplit(para,'Helvetica',11,510):c.drawString(48,y,line);y-=16
  y-=12
 assert y>60
 c.setFont('Helvetica',9);c.drawString(48,35,f'Fictional product test | Page {num} of {total}');c.showPage()
for slug,title,lines in cases:
 c=canvas.Canvas(str(out/f'{slug}.pdf'),pagesize=(612,792));page(c,title,lines,1,1);c.save()
for count in [5,6,12,13,25,26]:
 c=canvas.Canvas(str(out/f'boundary-{count:02d}-pages.pdf'),pagesize=(612,792));page(c,cases[0][1],cases[0][2],1,count)
 for i in range(2,count+1):page(c,f'Fictional Appendix {i-1}',[f'Appendix {i-1}: page-count test sheet.','This appendix is intentionally informational. It does not change the fees, term, renewal, cancellation, ownership, or notice provisions on page 1.','This document tests PDF page counting and checkout tier selection. It is not a realistic long-contract accuracy benchmark.'],i,count)
 c.save()
for f in sorted(out.glob('*.pdf')):print(f.name,len(PdfReader(f).pages))
