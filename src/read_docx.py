import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = []
            for p in tree.findall('.//w:p', namespaces):
                para_text = []
                for t in p.findall('.//w:t', namespaces):
                    if t.text:
                        para_text.append(t.text)
                if para_text:
                    texts.append(''.join(para_text))
                else:
                    texts.append('')
            return '\n'.join(texts)
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    file_path = sys.argv[1]
    print(read_docx(file_path))
