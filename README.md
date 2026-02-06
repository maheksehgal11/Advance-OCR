# 📄 OCR PDF Reader

A powerful web-based OCR (Optical Character Recognition) PDF reader that extracts text from PDF files with high precision using Tesseract.js and PDF.js.

## ✨ Features

- **PDF Upload**: Drag and drop or click to upload single PDF files
- **ZIP Batch Processing**: Upload ZIP files containing multiple PDFs for bulk processing
- **PDF Preview**: Navigate through PDF pages with intuitive controls
- **OCR Text Extraction**: Extract text from scanned PDFs and images using Tesseract.js
- **Smart Categorization**: Automatically categorize content into 8 domains
- **Opportunity Detection**: Identify and extract business opportunities with structured data
- **Quote Extraction**: Find and extract quoted text from documents
- **Real-time Progress**: Visual progress tracking during OCR processing
- **Text Download**: Download extracted text as a .txt file
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Client-side Processing**: All processing happens in your browser - no server uploads needed

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or navigate to the project directory:
```bash
cd d:\ProjectsV2\OCR
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

Start the development server:
```bash
npm start
```

The application will automatically open in your default browser at `http://localhost:8080`.

Alternatively, you can run:
```bash
npm run dev
```

## 📖 Usage

1. **Upload a PDF or ZIP**: Click on the upload area or drag and drop:
   - Single PDF file for individual processing
   - ZIP file containing multiple PDFs for batch processing
2. **Automatic Processing**: OCR extraction starts automatically upon upload
3. **Preview Pages**: Use the Previous/Next buttons to navigate through PDF pages
4. **View Results**: Switch between tabs to see:
   - **Text**: Raw extracted text from all PDFs
   - **Categories**: Content categorized by topic
   - **Opportunities**: Structured opportunity data with amounts, vendors, owners, dates, and status
   - **Quotes**: Extracted quoted text
5. **Download**: Click "Download Text" to save all extracted text as a .txt file
6. **Clear**: Click "Clear" to reset and upload new files

## 🛠️ Technologies Used

- **Tesseract.js** (v5.0.4): OCR engine for text extraction
- **PDF.js** (v3.11.174): PDF rendering and parsing
- **JSZip** (v3.10.1): ZIP file extraction for batch processing
- **Vanilla JavaScript**: No heavy frameworks - lightweight and fast
- **HTML5 & CSS3**: Modern, responsive design
- **http-server**: Simple development server

## 📁 Project Structure

```
OCR/
├── .github/
│   └── copilot-instructions.md
├── index.html          # Main HTML file
├── app.js              # Application logic
├── styles.css          # Styling
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## 🎯 Key Features Explained

### OCR Processing
The application uses Tesseract.js to perform optical character recognition on each page of the PDF. Pages are rendered to canvas elements at high resolution (2x scale) for better OCR accuracy.

### PDF Rendering
PDF.js is used to parse and render PDF files directly in the browser. Each page is rendered to a canvas element for preview and OCR processing.

### Progress Tracking
Real-time progress updates show which page is being processed and the OCR progress percentage for each page.

## 🔧 Customization

### Adjust OCR Language
Edit `app.js` and change the language parameter in the `Tesseract.recognize()` call:
```javascript
await Tesseract.recognize(canvas, 'eng', { ... })  // Change 'eng' to your language code
```

### Modify Rendering Scale
Adjust the scale in `app.js` for different quality/performance tradeoffs:
```javascript
const viewport = page.getViewport({ scale: 2 });  // Increase for higher quality
```

## 📝 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

If you have any questions or need help, please open an issue in the repository.

---

**Note**: This application processes all files locally in your browser. No data is sent to external servers, ensuring your privacy and security.
