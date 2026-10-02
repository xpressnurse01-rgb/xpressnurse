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
  let newContent = content.replace(/<select([^>]*?)value=\{([^}]+?\.area|area|nurseForm\.serviceArea|regServiceArea|patientArea|editNurseArea)\}([^>]*?)>([\s\S]*?)<\/select>/g, (match, p1, p2, p3, p4) => {
    if (p4.includes('<option')) {
       return '<input list="hyderabad-areas" placeholder="Select or enter area"' + p1 + 'value={' + p2 + '}' + p3 + '/>';
    }
    return match;
  });
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f);
  }
});
