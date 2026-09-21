import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Clock, 
  RefreshCw, 
  Package, 
  ChevronRight,
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ScanLine,
  Image as ImageIcon,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Boxes,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  Layers,
  AlertTriangle,
  BadgeCheck,
  Zap,
  Star
} from 'lucide-react';

export default function App() {
  // Navigation: 'home' | 'billing' | 'orders' | 'inventory' | 'analytics'
  const [activeTab, setActiveTab] = useState('home');

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Store / Inventory Navigation State
  const [selectedCategory, setSelectedCategory] = useState('Groceries');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Dairy');
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Billing / Cart State
  const [billItems, setBillItems] = useState([]);
  const [customerName, setCustomerName] = useState('Vruti Moradiya');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay');
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  // Scanner State
  const [scannerMode, setScannerMode] = useState('upload');
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, prodRes, ordRes, anaRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/analytics')
      ]);
      const failedResponse = [statsRes, prodRes, ordRes, anaRes].find(response => !response.ok);
      if (failedResponse) {
        throw new Error(`Inventory API request failed (${failedResponse.status}).`);
      }
      const statsJson = await statsRes.json();
      const prodJson = await prodRes.json();
      const ordJson = await ordRes.json();
      const anaJson = await anaRes.json();

      setStats(statsJson);
      setProducts(prodJson.products || []);
      setOrders(ordJson.orders || []);
      setAnalytics(anaJson);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Subcategories dynamically based on Category
  const subcategoriesList = useMemo(() => {
    const list = new Set();
    products.forEach(p => {
      if (p.category === selectedCategory) {
        list.add(p.subcategory);
      }
    });
    return Array.from(list);
  }, [products, selectedCategory]);

  // Ensure valid subcategory when category changes
  useEffect(() => {
    if (subcategoriesList.length > 0 && !subcategoriesList.includes(selectedSubcategory)) {
      setSelectedSubcategory(subcategoriesList[0]);
      setSelectedProductType(null);
      setSelectedBrand(null);
    }
  }, [subcategoriesList, selectedSubcategory]);

  // Compute Product Types dynamically based on Subcategory
  const productTypesList = useMemo(() => {
    const list = new Set();
    products.forEach(p => {
      if (p.category === selectedCategory && p.subcategory === selectedSubcategory && p.product_type) {
        list.add(p.product_type);
      }
    });
    return Array.from(list);
  }, [products, selectedCategory, selectedSubcategory]);

  // Compute Brands dynamically based on Subcategory & Product Type
  const brandsList = useMemo(() => {
    const list = new Set();
    products.forEach(p => {
      const matchesCat = p.category === selectedCategory;
      const matchesSub = p.subcategory === selectedSubcategory;
      const matchesType = !selectedProductType || p.product_type === selectedProductType;
      if (matchesCat && matchesSub && matchesType && p.brand) {
        list.add(p.brand);
      }
    });
    return Array.from(list);
  }, [products, selectedCategory, selectedSubcategory, selectedProductType]);

  // Group products by Product Type for the Inventory view
  const groupedByType = useMemo(() => {
    const map = {};

    products.forEach(p => {
      const matchesCat = p.category === selectedCategory;
      const matchesSub = p.subcategory === selectedSubcategory;
      const matchesType = !selectedProductType || p.product_type === selectedProductType;
      const matchesBrand = !selectedBrand || p.brand === selectedBrand;
      const matchesSearch = !searchQuery.trim() || 
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery.trim()));

      if (matchesCat && matchesSub && matchesType && matchesBrand && matchesSearch) {
        const typeKey = p.product_type || 'General Items';
        if (!map[typeKey]) {
          map[typeKey] = [];
        }
        map[typeKey].push(p);
      }
    });

    return Object.entries(map).map(([typeName, items]) => {
      const totalUnits = items.reduce((sum, item) => sum + item.stock_level, 0);
      const uniqueBrandsCount = new Set(items.map(i => i.brand)).size;
      return {
        typeName,
        totalUnits,
        uniqueBrandsCount,
        items
      };
    });
  }, [products, selectedCategory, selectedSubcategory, selectedProductType, selectedBrand, searchQuery]);

  // Sound Effect for POS barcode scan
  const playBeepSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context blocked or unsupported
    }
  };

  // Add Product to Active Bill
  const addProductToBill = (product) => {
    playBeepSound();
    setBillItems(prev => {
      const existing = prev.find(item => item.product_id === product.product_id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.product_id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.product_id,
            product_name: product.product_name,
            barcode: product.barcode || '',
            unit_price: Number(product.unit_price) || 0,
            quantity: 1,
            unit_of_measure: product.unit_of_measure || 'Unit',
            image_url: product.image_url || '',
            stock_level: product.stock_level || 0
          }
        ];
      }
    });

    setScanStatusMsg(`Added "${product.product_name}" (Rs.${product.unit_price}) to Bill`);
    setTimeout(() => {
      setScanStatusMsg('');
    }, 4000);
  };

  // Demo Scan: Realistic Chips Packet (Lays Classic Salted 52g)
  const handleDemoChipsScan = () => {
    const chipsProduct = products.find(p => p.product_id === 43) || {
      product_id: 43,
      product_name: "Lays Classic Salted 52g",
      unit_price: 20.0,
      barcode: "8900000000432",
      unit_of_measure: "Pack",
      stock_level: 59,
      image_url: "https://zaiqacork.com/wp-content/uploads/2024/10/Lays-Classic-Salted-52-gzaiqacork.jpg"
    };
    addProductToBill(chipsProduct);
    setScanStatusMsg(`✔ Optical Scan: Detected Lays Classic Salted 52g (Barcode: 8900000000432)`);
  };

  // Modify Cart Item Quantity
  const updateQuantity = (productId, delta) => {
    setBillItems(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Remove Item from Bill
  const removeBillItem = (productId) => {
    setBillItems(prev => prev.filter(item => item.product_id !== productId));
  };

  // Bill Calculations
  const billSubtotal = useMemo(() => {
    return billItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [billItems]);

  const billTax = useMemo(() => {
    return Math.round(billSubtotal * 0.05 * 100) / 100;
  }, [billSubtotal]);

  const billGrandTotal = useMemo(() => {
    return Math.round((billSubtotal + billTax) * 100) / 100;
  }, [billSubtotal, billTax]);

  // Barcode Lookup Handler
  const lookupAndAddBarcode = async (barcodeVal) => {
    const code = barcodeVal.trim();
    if (!code) return;

    setScanErrorMsg('');
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        addProductToBill(data);
        setManualBarcodeInput('');
      } else {
        setScanErrorMsg(data.detail || `Barcode "${code}" not found in catalog.`);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setScanErrorMsg(`Failed to lookup barcode "${code}".`);
    }
  };

  // File Upload Barcode Scan Handler
  const handleFileUpload = async (file) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setScannedPreview(previewUrl);
    setScanErrorMsg('');
    setIsScanning(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/scan_upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        addProductToBill(data);
      } else if (data.status === 'unmapped') {
        setScanErrorMsg(`Detected Barcode: ${data.barcode}, but it is not linked to any SKU in the catalog.`);
      } else {
        setScanErrorMsg(data.message || 'Could not detect barcode from uploaded image.');
      }
    } catch (err) {
      console.error('Upload scan error:', err);
      setScanErrorMsg('Error analyzing packaging image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Live Camera Frame Capture & Scan
  const captureAndScanCameraFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== 4 || video.videoWidth === 0) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const res = await fetch('/api/scan_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image })
      });
      const data = await res.json();

      if (data.status === 'success') {
        addProductToBill(data);
        stopCamera();
        setScannerMode('upload');
      } else if (data.status === 'unmapped') {
        setScanErrorMsg(`Detected Barcode: ${data.barcode} (Unmapped SKU)`);
      }
    } catch (err) {
      console.error('Camera frame scan error:', err);
    }
  };

  const startCamera = async () => {
    setScanErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(() => {
        captureAndScanCameraFrame();
      }, 400);
    } catch (err) {
      console.error("Camera access error:", err);
      setScanErrorMsg("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (activeTab === 'billing' && scannerMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, scannerMode]);

  // PROCEED TO PAY
  const handleProceedToPay = async () => {
    if (billItems.length === 0) {
      setScanErrorMsg("Bill is empty! Please scan or add products first.");
      return;
    }

    setIsCheckingOut(true);
    setScanErrorMsg('');

    const payload = {
      customer_name: customerName || 'Vruti Moradiya',
      customer_phone: customerPhone || 'N/A',
      payment_method: paymentMethod,
      items: billItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure
      })),
      subtotal: billSubtotal,
      tax: billTax,
      discount: 0.0,
      total_amount: billGrandTotal
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setLastCompletedOrder(data.order);
        setReceiptModalOpen(true);
        setBillItems([]);
        fetchData();
      } else {
        setScanErrorMsg(data.detail || data.message || 'Payment failed.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setScanErrorMsg('Checkout error occurred. Check backend service.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ===== FOODY HEADER ===== */}
      <header className="foody-header">
        <div className="header-inner">
          <div className="foody-brand">
            <div className="foody-logo" onClick={() => setActiveTab('home')}>
              <span className="logo-f">F</span>
              <span className="logo-oo">oo</span>
              <span className="logo-dy">dy</span>
            </div>
          </div>

          <nav className="foody-nav">
            <button className={`foody-nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
              Home
            </button>
            <button className={`foody-nav-link ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
              <Receipt size={15} style={{ marginRight: 4 }} />
              Start Billing
              {billItems.length > 0 && <span className="nav-badge">{billItems.length}</span>}
            </button>
            <button className={`foody-nav-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ShoppingBag size={15} style={{ marginRight: 4 }} />
              Orders
              {orders.length > 0 && <span className="nav-badge-muted">{orders.length}</span>}
            </button>
            <button className={`foody-nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <Boxes size={15} style={{ marginRight: 4 }} />
              Inventory
              {stats && <span className="nav-badge-muted">{stats.total_skus}</span>}
            </button>
            <button className={`foody-nav-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <Sparkles size={15} style={{ marginRight: 4 }} />
              AI Analysis
            </button>
          </nav>

          <div className="header-actions">
            <button onClick={fetchData} className="btn-sync" title="Reload data from CSV files">
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              <span>Sync</span>
            </button>
            <button className="btn-cart-icon" onClick={() => setActiveTab('billing')} title="Open Billing Terminal">
              <ShoppingCart size={18} />
              {billItems.length > 0 && <span className="cart-badge">{billItems.length}</span>}
            </button>
            <button className="btn-signup" onClick={() => setActiveTab('billing')}>
              Start Billing
            </button>
          </div>
        </div>
      </header>

      {/* ===== HOME (Hero Section) ===== */}
      {activeTab === 'home' && (
        <section className="hero-section">
          <div className="hero-left">
            <h1 className="hero-headline">
              it's not just<br/>
              F<span className="donut-o pink"></span><span className="donut-o chocolate"></span>d, It's an<br/>
              Experience.
            </h1>

            <div className="hero-cta-row">
              <button className="btn-view-menu" onClick={() => setActiveTab('inventory')}>
                View Menu
              </button>
              <button className="btn-book-table" onClick={() => setActiveTab('billing')}>
                Book A Table
              </button>
            </div>

            <div className="hero-reviews">
              <span className="reviews-label">Reviews</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="reviews-avatars">
                  <img className="review-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" alt="Reviewer" />
                  <img className="review-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" alt="Reviewer" />
                  <img className="review-avatar" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" alt="Reviewer" />
                  <span className="review-count">48+</span>
                </div>
              </div>
              <div className="review-stars">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={18} fill="#FF5722" color="#FF5722" />
                ))}
              </div>
            </div>
          </div>

          <div className="hero-right">
            <img 
              className="hero-food-img"
              src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop"
              alt="Delicious food platter"
            />
            <div className="discount-badge">
              <div>
                <span className="discount-percent">5%</span>
              </div>
              <div className="discount-text">
                <span>Discount</span>
                for 2 orders
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== START BILLING (Modern FinTech Design) ===== */}
      {activeTab === 'billing' && (
        <div className="oneplace-billing-container">
          {/* LEFT SCREEN: OPTICAL SCANNER DECK */}
          <div className="oneplace-scanner-card">
            <div className="scanner-card-header">
              <div className="scanner-badge-pill">
                <span className="live-pulse-dot"></span>
                <span>Optical Scanner</span>
              </div>
              <div className="scanner-segmented-toggle">
                <button
                  className={`seg-toggle-btn ${scannerMode === 'upload' ? 'active' : ''}`}
                  onClick={() => { setScannerMode('upload'); stopCamera(); }}
                >
                  <Upload size={14} />
                  <span>Upload</span>
                </button>
                <button
                  className={`seg-toggle-btn ${scannerMode === 'camera' ? 'active' : ''}`}
                  onClick={() => setScannerMode('camera')}
                >
                  <Camera size={14} />
                  <span>Camera</span>
                </button>
              </div>
            </div>

            {scanStatusMsg && (
              <div className="oneplace-toast success">
                <BadgeCheck size={16} />
                <span>{scanStatusMsg}</span>
              </div>
            )}

            {scanErrorMsg && (
              <div className="oneplace-toast error">
                <AlertCircle size={16} />
                <span>{scanErrorMsg}</span>
              </div>
            )}

            <div className="scanner-viewport-box">
              {scannerMode === 'upload' ? (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]); }}
                  />
                  <div
                    className="oneplace-dropzone"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {isScanning ? (
                      <div className="dropzone-scanning-state">
                        <RefreshCw className="spinner" size={32} color="#00d2d3" />
                        <span className="scanning-label">Scanning Barcode...</span>
                      </div>
                    ) : scannedPreview ? (
                      <div className="dropzone-preview-state">
                        <img src={scannedPreview} alt="Scanned" className="scanned-image-preview" />
                        <span className="preview-reupload-hint">Click or drop to scan another</span>
                      </div>
                    ) : (
                      <div className="dropzone-idle-state">
                        <div className="dropzone-icon-circle">
                          <ImageIcon size={28} />
                        </div>
                        <div className="dropzone-title">Drop packaging photo</div>
                        <div className="dropzone-sub">or click to browse image</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="oneplace-camera-viewport">
                  <video ref={videoRef} playsInline muted className="oneplace-camera-video" />
                  <div className="oneplace-reticle-overlay">
                    <div className="reticle-box">
                      <span className="corner tl"></span>
                      <span className="corner tr"></span>
                      <span className="corner bl"></span>
                      <span className="corner br"></span>
                      <div className="reticle-laser"></div>
                    </div>
                    <span className="reticle-tag">Align Barcode</span>
                  </div>
                </div>
              )}
            </div>

            {/* Manual lookup & quick action bar */}
            <div className="scanner-card-footer">
              <form
                className="scanner-manual-pill"
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupAndAddBarcode(manualBarcodeInput);
                }}
              >
                <ScanLine size={15} color="#8892b0" />
                <input
                  type="text"
                  placeholder="Enter Barcode / SKU..."
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                />
                <button type="submit" className="btn-manual-add">
                  <Plus size={13} /> Add
                </button>
              </form>

              <button onClick={handleDemoChipsScan} className="btn-quick-demo">
                <Zap size={14} /> Demo Scan (Lays)
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: EXECUTIVE ACTIVE BILL TERMINAL */}
          <div className="oneplace-billing-column">
            {/* 1. Master Balance & Register Card */}
            <div className="oneplace-balance-card">
              <div className="balance-header-row">
                <div>
                  <span className="balance-subheading">Total Payable</span>
                  <h2 className="balance-amount-title">₹ {billGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                </div>
                {billItems.length > 0 && (
                  <button onClick={() => setBillItems([])} className="btn-clear-pill">
                    <Trash2 size={13} /> Clear Bill
                  </button>
                )}
              </div>

              {/* Graphic Dual-Tone Register Card */}
              <div className="oneplace-graphic-card">
                <div className="graphic-card-left">
                  <div className="card-chip-icon">
                    <CreditCard size={18} />
                  </div>
                  <div className="card-brand-label">Foody Register #1</div>
                  <div className="card-items-counter">{billItems.reduce((acc, item) => acc + item.quantity, 0)} Items Scanned</div>
                </div>
                <div className="graphic-card-right">
                  <div className="card-stat-mini">
                    <span className="stat-label">Subtotal</span>
                    <span className="stat-val">₹{billSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="card-stat-mini">
                    <span className="stat-label">GST (5%)</span>
                    <span className="stat-val">₹{billTax.toFixed(2)}</span>
                  </div>
                  <div className="card-graphic-arc"></div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="payment-method-selector">
                {['UPI / GPay', 'Card', 'Cash'].map(method => (
                  <button
                    key={method}
                    type="button"
                    className={`method-chip ${paymentMethod === method ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Scanned Items List */}
            <div className="oneplace-items-card">
              <div className="items-card-header">
                <h3 className="items-card-title">Scanned Items</h3>
                <span className="items-count-badge">{billItems.length} SKUs</span>
              </div>

              <div className="items-list-container">
                {billItems.length === 0 ? (
                  <div className="items-empty-state">
                    <div className="empty-state-icon">
                      <ShoppingBag size={28} />
                    </div>
                    <h4>No items in bill</h4>
                    <p>Scan packaging or camera to start billing</p>
                  </div>
                ) : (
                  <div className="items-scroll-list">
                    {billItems.map(item => (
                      <div key={item.product_id} className="item-row-card">
                        <div className="item-avatar-badge">
                          {item.product_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="item-info-col">
                          <div className="item-title">{item.product_name}</div>
                          <div className="item-unit-price">₹{item.unit_price.toFixed(0)} / {item.unit_of_measure || 'unit'}</div>
                        </div>
                        <div className="item-stepper-pill">
                          <button onClick={() => updateQuantity(item.product_id, -1)} className="stepper-btn">
                            <Minus size={12} />
                          </button>
                          <span className="stepper-qty">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, 1)} className="stepper-btn">
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="item-total-col">
                          <span className="item-row-total">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                          <button onClick={() => removeBillItem(item.product_id)} className="btn-remove-item" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Proceed to Pay CTA */}
              <button
                onClick={handleProceedToPay}
                disabled={billItems.length === 0 || isCheckingOut}
                className="oneplace-btn-pay"
              >
                {isCheckingOut ? (
                  <>
                    <RefreshCw className="spinner" size={18} />
                    <span>Generating Bill...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Pay</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ORDERS ===== */}
      {activeTab === 'orders' && (
        <div className="foody-app" style={{ marginTop: '24px' }}>
          <div className="orders-header-card">
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foody-orange)' }}>Completed Orders & Invoices</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>Total {orders.length} orders recorded. Stock deductions synced in inventory.csv.</p>
            </div>
            <button onClick={() => setActiveTab('billing')} className="btn-new-bill"><Plus size={16} /> Start New Bill</button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-orders-card">
              <Receipt size={48} color="#E0E0E0" />
              <h3 style={{ marginTop: '12px' }}>No orders placed yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Scan product barcodes in "Start Billing" and click Proceed to Pay to generate your first order.
              </p>
            </div>
          ) : (
            <div className="orders-grid">
              {orders.map(order => (
                <div key={order.order_id} className="order-history-card">
                  <div className="order-card-top">
                    <div>
                      <div className="order-id-badge">{order.order_id}</div>
                      <span className="order-time">{order.created_at}</span>
                    </div>
                    <span className="order-status-tag">{order.status}</span>
                  </div>
                  <div className="order-card-customer"><strong>{order.customer_name}</strong> {order.customer_phone && `(${order.customer_phone})`}</div>
                  <div className="order-items-preview">
                    {order.items && order.items.map((it, idx) => (
                      <div key={idx} className="order-preview-line">
                        <span>{it.quantity}x {it.product_name}</span>
                        <span>Rs.{(it.quantity * it.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-card-footer">
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Paid via {order.payment_method}</span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Rs.{order.total_amount.toFixed(2)}</strong>
                    </div>
                    <button onClick={() => setViewingOrder(order)} className="btn-view-invoice"><Receipt size={14} /> View Receipt</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== INVENTORY ===== */}
      {activeTab === 'inventory' && (
        <div>
          <nav className="category-pills-bar">
            <div className="category-pills-container">
              {stats && stats.category_breakdown.map((cat) => (
                <button key={cat.category} className={`cat-pill-btn ${selectedCategory === cat.category ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(cat.category); setSelectedProductType(null); setSelectedBrand(null); }}>
                  <span>{cat.category}</span>
                  <span className="cat-count-badge">{cat.items}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="foody-app">
            <div className="main-store-layout">
              <aside className="subcategories-sidebar">
                <div className="sidebar-title">{selectedCategory} Subcategories</div>
                {subcategoriesList.map((sub) => (
                  <button key={sub} className={`subcat-sidebar-item ${selectedSubcategory === sub ? 'active' : ''}`}
                    onClick={() => { setSelectedSubcategory(sub); setSelectedProductType(null); setSelectedBrand(null); }}>
                    <span>{sub}</span>
                    <ChevronRight size={14} color="#BDBDBD" />
                  </button>
                ))}
              </aside>

              <main className="store-content-area">
                <section className="filter-controls-card">
                  <div style={{ position: 'relative', marginBottom: '4px' }}>
                    <Search className="search-header-icon" size={16} />
                    <input type="text" placeholder="Search inventory items, barcodes, or brands..." className="search-header-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>

                  {productTypesList.length > 0 && (
                    <div className="filter-section-row">
                      <span className="filter-section-title">{selectedSubcategory} Categories ({productTypesList.length})</span>
                      <div className="chips-scroll-row">
                        {productTypesList.map((ptype) => (
                          <button key={ptype} className={`chip-btn ${selectedProductType === ptype ? 'active' : ''}`}
                            onClick={() => { setSelectedProductType(selectedProductType === ptype ? null : ptype); setSelectedBrand(null); }}>
                            {ptype}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {brandsList.length > 0 && (
                    <div className="filter-section-row">
                      <span className="filter-section-title">Brands ({brandsList.length})</span>
                      <div className="chips-scroll-row">
                        {brandsList.map((b) => (
                          <button key={b} className={`chip-btn ${selectedBrand === b ? 'active' : ''}`}
                            onClick={() => setSelectedBrand(selectedBrand === b ? null : b)}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
                    <RefreshCw className="spinner" size={32} style={{ margin: '0 auto 12px auto' }} />
                    <p>Loading catalog & live stock...</p>
                  </div>
                ) : groupedByType.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px' }}>
                    <Package size={48} color="#E0E0E0" style={{ margin: '0 auto 12px auto' }} />
                    <h3>No products found</h3>
                    <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginTop: '4px' }}>Try selecting another subcategory or clear search.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {groupedByType.map((group) => (
                      <section key={group.typeName} className="ptype-group-section">
                        <div className="ptype-group-header">
                          <div className="ptype-header-title">
                            <Layers size={18} color="var(--foody-orange)" />
                            <span>{group.typeName}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                              ({group.uniqueBrandsCount} Brands | {group.items.length} Items)
                            </span>
                          </div>
                          <div className="ptype-header-stats">Remaining Stock: {group.totalUnits.toLocaleString()} Units</div>
                        </div>

                        <div className="products-grid">
                          {group.items.map((p) => (
                            <div key={p.product_id} className="clean-product-card">
                              <div className="card-brand-badge">{p.brand}</div>
                              <div className={`stock-tag-pill ${p.stock_level <= 10 ? 'low' : ''}`}>{p.stock_level} in stock</div>

                              <div className="card-image-wrapper">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.product_name} className="product-real-img"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                ) : null}
                                <div className="product-img-fallback" style={{ display: p.image_url ? 'none' : 'flex' }}>
                                  <Package size={28} color="var(--text-muted)" />
                                </div>
                              </div>

                              <div className="card-info">
                                <h3 className="card-product-name" title={p.product_name}>{p.product_name}</h3>
                              </div>

                              <div className="card-details-footer">
                                <div className="price-display-block">
                                  <span className="price-label">Price</span>
                                  <span className="price-val">Rs.{p.unit_price.toFixed(0)}</span>
                                </div>
                                <div className="units-display-block">
                                  <span className="units-label">Available</span>
                                  <span className="units-val" style={{ color: p.stock_level <= 10 ? '#F44336' : 'var(--foody-green)' }}>
                                    {p.stock_level} {p.unit_of_measure}
                                  </span>
                                </div>
                              </div>

                              <button onClick={() => { addProductToBill(p); setActiveTab('billing'); }} className="btn-card-bill-add">
                                <Plus size={14} /> Add to Bill
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      )}

      {/* ===== AI ANALYSIS ===== */}
      {activeTab === 'analytics' && (
        <div className="foody-app" style={{ marginTop: '24px' }}>
          <div className="analytics-metrics-grid">
            <div className="analytics-stat-card">
              <div className="stat-card-top">
                <span className="stat-title">Inventory Health Score</span>
                <span className="stat-icon-circle green"><BadgeCheck size={20} /></span>
              </div>
              <div className="stat-main-num" style={{ color: 'var(--foody-green)' }}>
                {analytics ? `${analytics.inventory_health_score}%` : '89.2%'}
              </div>
              <p className="stat-subtitle">Ratio of healthy SKUs above safety reorder thresholds</p>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-card-top">
                <span className="stat-title">Store Capital Valuation</span>
                <span className="stat-icon-circle orange"><CreditCard size={20} /></span>
              </div>
              <div className="stat-main-num">
                {analytics ? `Rs.${(analytics.total_inventory_valuation / 100000).toFixed(2)}L` : 'Rs.69.33L'}
              </div>
              <p className="stat-subtitle">Total active inventory stock worth</p>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-card-top">
                <span className="stat-title">POS Billed Revenue</span>
                <span className="stat-icon-circle orange"><TrendingUp size={20} /></span>
              </div>
              <div className="stat-main-num" style={{ color: 'var(--foody-orange)' }}>
                {analytics ? `Rs.${analytics.total_billed_revenue.toFixed(2)}` : 'Rs.0.00'}
              </div>
              <p className="stat-subtitle">From {analytics?.total_orders_count || 0} completed orders</p>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-card-top">
                <span className="stat-title">Reorder Alerts</span>
                <span className="stat-icon-circle red"><AlertTriangle size={20} /></span>
              </div>
              <div className="stat-main-num" style={{ color: '#F44336' }}>
                {analytics ? analytics.low_stock_count : 0} SKUs
              </div>
              <p className="stat-subtitle">Items below safety reorder level</p>
            </div>
          </div>

          <div className="ai-insights-section">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--foody-orange)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={20} /> AI Inventory Intelligence & Actionable Insights
            </h3>
            <div className="ai-insights-list">
              {analytics && analytics.ai_insights ? analytics.ai_insights.map((ins, i) => (
                <div key={i} className={`ai-insight-card ${ins.type}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="insight-bullet-icon">
                      {ins.type === 'warning' ? <AlertTriangle size={18} /> : <Zap size={18} />}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '2px' }}>{ins.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>{ins.desc}</p>
                    </div>
                  </div>
                </div>
              )) : (<p>Loading insights...</p>)}
            </div>
          </div>

          <div className="forecast-card">
            <div className="forecast-card-header">
              <div>
                <h3><TrendingUp size={20} /> 30-Day Demand Forecast</h3>
                <p>Based on the latest 8 weeks of POS sales
                  {analytics?.demand_forecast?.forecast_start_date && ` - forecast begins ${analytics.demand_forecast.forecast_start_date}`}
                </p>
              </div>
              <span className="forecast-method-badge">Weekday-aware model</span>
            </div>
            <div className="forecast-table-wrap">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>Product</th><th>Daily Demand</th><th>Next 30 Days</th><th>Stock Cover</th><th>Estimated Stock-out</th><th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.demand_forecast?.items?.length ? analytics.demand_forecast.items.map(item => (
                    <tr key={item.product_id}>
                      <td><strong>{item.product_name}</strong><span>{item.category} | {item.stock_level} units available</span></td>
                      <td>{item.avg_daily_demand} units/day</td>
                      <td><strong>{item.forecast_30_days} units</strong></td>
                      <td className={item.days_of_cover <= 30 ? 'forecast-risk' : ''}>{item.days_of_cover} days</td>
                      <td className={item.days_of_cover <= 30 ? 'forecast-risk' : ''}>{item.estimated_stockout_date}</td>
                      <td><span className={`confidence-badge ${item.confidence.toLowerCase()}`}>{item.confidence}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="forecast-empty">Loading sales history and forecasts...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEIPT MODAL ===== */}
      {(receiptModalOpen || viewingOrder) && (
        <div className="modal-overlay" onClick={() => { setReceiptModalOpen(false); setViewingOrder(null); }}>
          <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foody-orange)', fontFamily: 'var(--font-serif)' }}>Foody</h2>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.05em' }}>TAX INVOICE & CASH RECEIPT</p>
              </div>
              <button onClick={() => { setReceiptModalOpen(false); setViewingOrder(null); }} className="btn-close-receipt"><X size={18} /></button>
            </div>
            {(() => {
              const ord = viewingOrder || lastCompletedOrder;
              if (!ord) return null;
              return (
                <div className="receipt-body">
                  <div className="receipt-meta-grid">
                    <div><span className="receipt-meta-label">Invoice ID</span><strong className="receipt-meta-val">{ord.order_id}</strong></div>
                    <div><span className="receipt-meta-label">Date & Time</span><strong className="receipt-meta-val">{ord.created_at}</strong></div>
                    <div><span className="receipt-meta-label">Customer</span><strong className="receipt-meta-val">{ord.customer_name}</strong></div>
                    <div><span className="receipt-meta-label">Payment Mode</span><strong className="receipt-meta-val" style={{ color: 'var(--foody-green)' }}>{ord.payment_method}</strong></div>
                  </div>
                  <div className="receipt-divider"></div>
                  <table className="receipt-items-table">
                    <thead><tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amt</th></tr></thead>
                    <tbody>
                      {ord.items && ord.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><div style={{ fontWeight: 700 }}>{it.product_name}</div>{it.barcode && <div style={{ fontSize: '0.68rem', color: '#9E9E9E' }}>{it.barcode}</div>}</td>
                          <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                          <td style={{ textAlign: 'right' }}>Rs.{it.unit_price.toFixed(0)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs.{(it.quantity * it.unit_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="receipt-divider"></div>
                  {ord.inventory_updates && ord.inventory_updates.length > 0 && (
                    <div className="receipt-stock-notice">
                      <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>Inventory CSV Decrement Status:</span>
                      {ord.inventory_updates.map((u, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                          <span>{u.product_name}</span>
                          <span style={{ color: 'var(--foody-orange)', fontWeight: 700 }}>{u.previous_stock} → {u.remaining_stock} remaining</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="receipt-totals">
                    <div className="receipt-total-line"><span>Subtotal:</span><span>Rs.{ord.subtotal.toFixed(2)}</span></div>
                    <div className="receipt-total-line"><span>GST (5%):</span><span>Rs.{ord.tax.toFixed(2)}</span></div>
                    <div className="receipt-total-line grand"><span>TOTAL PAID:</span><span>Rs.{ord.total_amount.toFixed(2)}</span></div>
                  </div>
                  <div className="receipt-footer-buttons">
                    <button onClick={() => window.print()} className="btn-print-receipt"><Printer size={16} /> Print Receipt</button>
                    <button onClick={() => { setReceiptModalOpen(false); setViewingOrder(null); setActiveTab('billing'); }} className="btn-new-bill-done">+ Start Next Bill</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
