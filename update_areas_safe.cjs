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

  // Replace area selects manually with safer logic
  // We look for `<select` and then find the corresponding `</select>`.
  // If it contains `value={...area}` and `<option`, we replace it.
  
  let i = 0;
  while ((i = content.indexOf('<select', i)) !== -1) {
    let endIdx = content.indexOf('</select>', i);
    if (endIdx === -1) break;
    endIdx += '</select>'.length;
    
    let block = content.substring(i, endIdx);
    
    // Check if it's an area select
    if (block.match(/value=\{([^}]+?\.area|area|nurseForm\.serviceArea|regServiceArea|patientArea|editNurseArea|consultForm\.area|patientForm\.area)\}/) && block.includes('<option')) {
      // Find the opening tag's end
      let tagEnd = block.indexOf('>');
      let openTag = block.substring(0, tagEnd + 1);
      
      // Replace `<select` with `<input list="hyderabad-areas" placeholder="Select or enter area"`
      let newInput = openTag.replace('<select', '<input list="hyderabad-areas" placeholder="Select or enter area"');
      
      // Remove `>` and add `/>`
      newInput = newInput.replace(/>\s*$/, ' />');
      
      content = content.substring(0, i) + newInput + content.substring(endIdx);
      i += newInput.length;
    } else {
      i = endIdx;
    }
  }

  fs.writeFileSync(f, content);
  console.log('Updated ' + f);
});
