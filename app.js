// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const contentArea = document.getElementById('contentArea');
const pdfCanvas = document.getElementById('pdfCanvas');
const outputText = document.getElementById('outputText');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State
let pdfDocument = null;
let currentPage = 1;
let totalPages = 0;
let extractedText = '';
let categories = [];
let opportunities = [];
let quotes = [];
let allPDFs = []; // Store all PDFs from ZIP
let currentPDFIndex = 0;

// Upload Area Events
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf' || file.type === 'application/zip' || file.name.endsWith('.zip')) {
            handleFileUpload(file);
        } else {
            alert('Please upload a PDF or ZIP file.');
        }
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// Handle File Upload
async function handleFileUpload(file) {
    try {
        console.log('Starting file upload...', file.name, 'Type:', file.type);
        
        // Check if it's a ZIP file
        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
            console.log('ZIP file detected, extracting PDFs...');
            await handleZipUpload(file);
        } else if (file.type === 'application/pdf') {
            console.log('Single PDF file detected');
            await handleSinglePDF(file);
        } else {
            alert('Please upload a PDF or ZIP file.');
        }
    } catch (error) {
        console.error('Error handling file upload:', error);
        alert('Error processing file. Please try again.');
    }
}

// Handle ZIP file with multiple PDFs
async function handleZipUpload(zipFile) {
    try {
        progressContainer.style.display = 'block';
        progressText.textContent = 'Extracting PDFs from ZIP...';
        progressFill.style.width = '10%';
        
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        
        // Extract all PDF files
        allPDFs = [];
        const pdfPromises = [];
        
        zipData.forEach((relativePath, file) => {
            if (relativePath.toLowerCase().endsWith('.pdf') && !relativePath.startsWith('__MACOSX')) {
                pdfPromises.push(
                    file.async('arraybuffer').then(data => ({
                        name: relativePath,
                        data: data
                    }))
                );
            }
        });
        
        allPDFs = await Promise.all(pdfPromises);
        console.log(`Found ${allPDFs.length} PDF files in ZIP`);
        
        if (allPDFs.length === 0) {
            alert('No PDF files found in the ZIP archive.');
            progressContainer.style.display = 'none';
            return;
        }
        
        progressText.textContent = `Found ${allPDFs.length} PDFs. Starting processing...`;
        progressFill.style.width = '20%';
        
        // Process all PDFs
        await processMultiplePDFs();
        
    } catch (error) {
        console.error('Error processing ZIP file:', error);
        alert('Error extracting ZIP file. Please ensure it contains valid PDF files.');
        progressContainer.style.display = 'none';
    }
}

// Process multiple PDFs from ZIP
async function processMultiplePDFs() {
    extractedText = '';
    categories = [];
    opportunities = [];
    quotes = [];
    
    // Show controls and content area
    controls.style.display = 'flex';
    contentArea.style.display = 'grid';
    
    for (let i = 0; i < allPDFs.length; i++) {
        const pdfFile = allPDFs[i];
        currentPDFIndex = i;
        
        console.log(`Processing PDF ${i + 1}/${allPDFs.length}: ${pdfFile.name}`);
        progressText.textContent = `Processing ${pdfFile.name} (${i + 1}/${allPDFs.length})...`;
        progressFill.style.width = `${20 + (i / allPDFs.length) * 60}%`;
        
        try {
            // Load PDF
            pdfDocument = await pdfjsLib.getDocument(pdfFile.data).promise;
            totalPages = pdfDocument.numPages;
            
            // Render first page of first PDF for preview
            if (i === 0) {
                currentPage = 1;
                await renderPage(currentPage);
                updatePageInfo();
            }
            
            // Extract text from this PDF
            await extractTextFromCurrentPDF(pdfFile.name);
            
        } catch (error) {
            console.error(`Error processing ${pdfFile.name}:`, error);
        }
    }
    
    // Final analysis
    progressText.textContent = 'Analyzing all extracted text...';
    progressFill.style.width = '90%';
    
    console.log('Total extracted text length:', extractedText.length);
    console.log('Starting combined analysis...');
    
    analyzeText(extractedText);
    
    progressText.textContent = `Processing complete! Processed ${allPDFs.length} PDFs.`;
    progressFill.style.width = '100%';
    downloadBtn.style.display = 'inline-flex';
    
    setTimeout(() => {
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
    }, 3000);
}

// Extract text from current PDF in memory
async function extractTextFromCurrentPDF(filename) {
    try {
        extractedText += `\n\n=== FILE: ${filename} ===\n`;
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });
            
            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const { data: { text } } = await Tesseract.recognize(
                tempCanvas,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const percent = Math.round(m.progress * 100);
                            progressText.textContent = `${filename} - Page ${pageNum}/${totalPages}: ${percent}%`;
                        }
                    }
                }
            );

            extractedText += `\n--- Page ${pageNum} ---\n${text}\n`;
            outputText.value = extractedText;
        }
        
        console.log(`Completed extraction from ${filename}`);
    } catch (error) {
        console.error(`Error extracting text from ${filename}:`, error);
        extractedText += `\n[Error processing ${filename}]\n`;
    }
}

// Handle single PDF file
async function handleSinglePDF(file) {
    try {
        console.log('Starting PDF upload...', file.name);
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPages = pdfDocument.numPages;
        currentPage = 1;
        
        console.log('PDF loaded. Total pages:', totalPages);

        // Show controls and content area
        controls.style.display = 'flex';
        contentArea.style.display = 'grid';
        
        // Render first page
        await renderPage(currentPage);
        
        // Update page info
        updatePageInfo();
        
        console.log('Starting automatic text extraction...');
        // Automatically start text extraction
        await extractTextFromPDF();
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file. Please try again.');
    }
}

// Render PDF Page
async function renderPage(pageNum) {
    try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = pdfCanvas;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

// Page Navigation
prevPage.addEventListener('click', async () => {
    if (currentPage > 1) {
        currentPage--;
        await renderPage(currentPage);
        updatePageInfo();
    }
});

nextPage.addEventListener('click', async () => {
    if (currentPage < totalPages) {
        currentPage++;
        await renderPage(currentPage);
        updatePageInfo();
    }
});

function updatePageInfo() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
}

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

// Text Analysis Functions
function analyzeText(text) {
    console.log('Analyzing text of length:', text.length);
    categories = categorizeText(text);
    console.log('Categories found:', categories.length);
    opportunities = detectOpportunities(text);
    console.log('Opportunities found:', opportunities.length);
    quotes = extractQuotes(text);
    console.log('Quotes found:', quotes.length);
    
    displayCategories();
    displayOpportunities();
    displayQuotes();
}

function categorizeText(text) {
    const categoryPatterns = {
        'Business': {
            icon: '💼',
            keywords: ['business', 'company', 'market', 'revenue', 'profit', 'sales', 'customer', 'client', 'industry', 'enterprise', 'commercial', 'trade']
        },
        'Finance': {
            icon: '💰',
            keywords: ['finance', 'financial', 'money', 'investment', 'budget', 'cost', 'price', 'payment', 'expense', 'income', 'tax', 'accounting', 'fiscal']
        },
        'Technology': {
            icon: '💻',
            keywords: ['technology', 'software', 'hardware', 'digital', 'system', 'platform', 'application', 'data', 'cloud', 'AI', 'automation', 'computing']
        },
        'Legal': {
            icon: '⚖️',
            keywords: ['legal', 'law', 'contract', 'agreement', 'terms', 'compliance', 'regulation', 'policy', 'rights', 'liability', 'clause']
        },
        'Marketing': {
            icon: '📢',
            keywords: ['marketing', 'advertising', 'promotion', 'brand', 'campaign', 'social media', 'content', 'engagement', 'strategy', 'audience']
        },
        'Project Management': {
            icon: '📊',
            keywords: ['project', 'task', 'deadline', 'milestone', 'timeline', 'deliverable', 'schedule', 'planning', 'resource', 'objective']
        },
        'Education': {
            icon: '📚',
            keywords: ['education', 'learning', 'training', 'course', 'study', 'research', 'academic', 'student', 'knowledge', 'development']
        },
        'Healthcare': {
            icon: '🏥',
            keywords: ['health', 'medical', 'patient', 'treatment', 'diagnosis', 'care', 'clinical', 'hospital', 'doctor', 'medicine']
        }
    };
    
    const textLower = text.toLowerCase();
    const results = [];
    
    for (const [category, data] of Object.entries(categoryPatterns)) {
        const matches = data.keywords.filter(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            return regex.test(textLower);
        });
        
        if (matches.length > 0) {
            const count = matches.reduce((acc, keyword) => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                return acc + (textLower.match(regex) || []).length;
            }, 0);
            
            results.push({
                name: category,
                icon: data.icon,
                count: count,
                keywords: matches.slice(0, 5)
            });
        }
    }
    
    return results.sort((a, b) => b.count - a.count);
}

function detectOpportunities(text) {
    const opportunities = [];
    const lines = text.split('\n');
    
    // Patterns to detect various opportunity fields
    const amountPattern = /\$\s*[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?|euros?)\b/gi;
    const datePattern = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const statusPattern = /\b(open|closed|pending|in progress|approved|rejected|new|active|inactive|completed)\b/gi;
    
    const opportunityPatterns = [
        { pattern: /\b(opportunity|opportunities)\b/gi, type: 'Business Opportunity' },
        { pattern: /\b(renewal|renew)\b/gi, type: 'Renewal' },
        { pattern: /\b(proposal|quote|quotation)\b/gi, type: 'Proposal' },
        { pattern: /\b(contract|agreement)\b/gi, type: 'Contract' },
        { pattern: /\b(sale|sales|deal)\b/gi, type: 'Sales' },
        { pattern: /\b(action item|action|todo|to-do)\b/gi, type: 'Action Item' },
        { pattern: /\b(follow up|follow-up)\b/gi, type: 'Follow Up' },
        { pattern: /\b(project|initiative)\b/gi, type: 'Project' }
    ];
    
    lines.forEach((line, index) => {
        if (line.trim().length < 15) return;
        
        opportunityPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(line)) {
                // Get context (current line + surrounding lines)
                const contextLines = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3));
                const context = contextLines.join(' ').trim();
                
                // Extract opportunity ID (alphanumeric codes like FCTEMS882500)
                const oppIdMatch = context.match(/\b[A-Z]{2,}[A-Z0-9]{6,12}\b/);
                const oppId = oppIdMatch ? oppIdMatch[0] : `OPP-${opportunities.length + 1}`;
                
                // Extract amount
                const amountMatch = context.match(amountPattern);
                const amount = amountMatch ? amountMatch[0].trim() : '-';
                
                // Extract vendor/company name (capitalized words, typically 2-4 words)
                const vendorMatch = context.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:\s+(?:Inc|LLC|Ltd|Corp|Co|Limited|Corporation)\.?)?)\b/);
                const vendor = vendorMatch ? vendorMatch[0] : 'Unknown Vendor';
                
                // Extract owner/email
                const emailMatch = context.match(emailPattern);
                const owner = emailMatch ? emailMatch[0] : 'Not specified';
                
                // Extract dates
                const dateMatch = context.match(datePattern);
                const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
                
                // Extract status
                const statusMatch = context.match(statusPattern);
                const status = statusMatch ? statusMatch[0].toUpperCase() : 'OPEN';
                
                // Calculate aging (days)
                const creationDate = new Date(date);
                const today = new Date();
                const aging = Math.floor((today - creationDate) / (1000 * 60 * 60 * 24));
                const agingText = aging > 0 ? `${aging} Days` : '0 Days';
                
                // Check for duplicates
                if (!opportunities.find(o => o.oppId === oppId)) {
                    opportunities.push({
                        oppId: oppId,
                        type: type,
                        amount: amount,
                        vendor: vendor,
                        owner: owner,
                        creationDate: date,
                        aging: agingText,
                        status: status,
                        description: line.trim().substring(0, 200),
                        page: Math.ceil((index + 1) / (lines.length / totalPages))
                    });
                }
            }
        });
    });
    
    return opportunities.slice(0, 30);
}

function extractQuotes(text) {
    const quotes = [];
    
    // Match text within quotes
    const quotePatterns = [
        /"([^"]{20,500})"/g,
        /'([^']{20,500})'/g,
        /«([^»]{20,500})»/g,
        /[""]([^""]{20,500})[""]/g
    ];
    
    quotePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const quote = match[1].trim();
            if (quote.length > 20 && !quotes.find(q => q.text === quote)) {
                quotes.push({
                    text: quote,
                    length: quote.length,
                    context: extractContext(text, match.index)
                });
            }
        }
    });
    
    return quotes.slice(0, 15);
}

function extractContext(text, position) {
    const start = Math.max(0, position - 50);
    const end = Math.min(text.length, position + 50);
    return '...' + text.substring(start, end).trim() + '...';
}

function displayCategories() {
    const container = document.getElementById('categoriesContainer');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">No categories detected</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Mentions</th>
                    <th>Keywords Found</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                    <tr>
                        <td>
                            <span class="category-badge">
                                <span class="category-icon-sm">${cat.icon}</span>
                                <span>${cat.name}</span>
                            </span>
                        </td>
                        <td>
                            <span class="count-badge">${cat.count}</span>
                        </td>
                        <td>
                            <div class="keywords-cell">
                                ${cat.keywords.map(k => `<span class="keyword-tag">${k}</span>`).join('')}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayOpportunities() {
    const container = document.getElementById('opportunitiesContainer');
    
    if (opportunities.length === 0) {
        container.innerHTML = '<p class="empty-state">No opportunities detected</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 30px;"></th>
                    <th>OPPORTUNITY</th>
                    <th>AMOUNT</th>
                    <th>VENDOR</th>
                    <th>OWNER</th>
                    <th>CREATION DATE / AGING</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                </tr>
            </thead>
            <tbody>
                ${opportunities.map((opp, index) => `
                    <tr>
                        <td><input type="checkbox" /></td>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #10b981; font-weight: 600; font-size: 0.75rem; margin-bottom: 3px;">${opp.type.toUpperCase()}</span>
                                <strong style="color: #4f46e5; font-size: 0.95rem;">${opp.oppId}</strong>
                                <span style="color: #6b7280; font-size: 0.85rem; margin-top: 2px;">${opp.description}</span>
                            </div>
                        </td>
                        <td style="text-align: right; font-weight: 600;">${opp.amount}</td>
                        <td>${opp.vendor}</td>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 600; color: #1f2937;">${opp.owner}</span>
                                <span style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">Created By: ${opp.owner}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <span>${opp.creationDate}</span>
                                <span style="font-size: 0.85rem; color: #6b7280;">${opp.aging}</span>
                            </div>
                        </td>
                        <td>
                            <span class="status-badge status-${opp.status.toLowerCase()}">${opp.status}</span>
                        </td>
                        <td style="text-align: center;">
                            <button class="action-menu">⋮</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayQuotes() {
    const container = document.getElementById('quotesContainer');
    
    if (quotes.length === 0) {
        container.innerHTML = '<p class="empty-state">No quotes found</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Quote</th>
                    <th>Length</th>
                </tr>
            </thead>
            <tbody>
                ${quotes.map((quote, index) => `
                    <tr>
                        <td><strong>${index + 1}</strong></td>
                        <td class="text-cell">"${quote.text}"</td>
                        <td><span class="count-badge">${quote.length}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Extract Text with OCR
async function extractTextFromPDF() {
    if (!pdfDocument) {
        console.log('No PDF document loaded');
        return;
    }

    console.log('Starting OCR extraction for', totalPages, 'pages');
    progressContainer.style.display = 'block';
    extractedText = '';
    outputText.value = '';

    try {
        for (let i = 1; i <= totalPages; i++) {
            console.log(`Processing page ${i}/${totalPages}`);
            progressText.textContent = `Processing page ${i} of ${totalPages}...`;
            progressFill.style.width = `${(i / totalPages) * 100}%`;

            // Render page to canvas
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale: 2 }); // Higher scale for better OCR
            
            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            console.log('Canvas rendered for page', i);

            // Perform OCR on the canvas
            const { data: { text } } = await Tesseract.recognize(
                tempCanvas,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const percent = Math.round(m.progress * 100);
                            progressText.textContent = `OCR processing page ${i} of ${totalPages}: ${percent}%`;
                        }
                    }
                }
            );

            console.log('OCR completed for page', i, '- Text length:', text.length);
            extractedText += `\n--- Page ${i} ---\n${text}\n`;
            outputText.value = extractedText;
        }

        console.log('Total extracted text length:', extractedText.length);
        console.log('Starting text analysis...');
        
        // Analyze the extracted text
        analyzeText(extractedText);

        progressText.textContent = 'Text extraction complete!';
        downloadBtn.style.display = 'inline-flex';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
        }, 2000);

    } catch (error) {
        console.error('Error extracting text:', error);
        alert('Error during text extraction. Please try again.');
        progressContainer.style.display = 'none';
    }
}

// Download Extracted Text
downloadBtn.addEventListener('click', () => {
    if (!extractedText) {
        alert('No text to download.');
        return;
    }

    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Clear All
clearBtn.addEventListener('click', () => {
    pdfDocument = null;
    currentPage = 1;
    totalPages = 0;
    extractedText = '';
    categories = [];
    opportunities = [];
    quotes = [];
    allPDFs = [];
    currentPDFIndex = 0;
    
    fileInput.value = '';
    outputText.value = '';
    
    // Clear analysis displays
    document.getElementById('categoriesContainer').innerHTML = '<p class="empty-state">Processing PDF to categorize content...</p>';
    document.getElementById('opportunitiesContainer').innerHTML = '<p class="empty-state">Processing PDF to detect opportunities...</p>';
    document.getElementById('quotesContainer').innerHTML = '<p class="empty-state">Processing PDF to extract quotes...</p>';
    
    controls.style.display = 'none';
    contentArea.style.display = 'none';
    downloadBtn.style.display = 'none';
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
    
    // Reset to text tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="text"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('textTab').classList.add('active');
});
