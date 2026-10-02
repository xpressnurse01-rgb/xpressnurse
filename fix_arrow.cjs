const fs = require('fs');
const files = [
  'src/components/AdminDashboard.tsx',
  'src/components/NurseDashboard.tsx',
  'src/components/DoctorDashboard.tsx',
  'src/components/BookingModal.tsx',
  'src/components/LoginPage.tsx'
];
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/onChange=\{\(e\)\s*=\/>/g, 'onChange={(e) =>');
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Fixed ' + f);
  }
});
