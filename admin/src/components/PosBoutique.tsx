import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { ProductItem, BoutiqueOrder, ProductVariant } from '../types';
import { BarcodeSVG } from './BarcodeRenderer';
import { StudentProfilePage } from './StudentProfilePage';
import { formatCurrency } from '../utils/currency';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { ModuleSubSidebar } from './ModuleSubSidebar';
import {
  ShoppingBag,
  CreditCard,
  Banknote,
  Building2,
  TrendingDown,
  Trash2,
  Plus,
  Printer,
  CheckCircle2,
  X,
  Search,
  Users,
  Package,
  FileText,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Edit2,
  Scan,
  Calendar,
  Layers,
  Phone,
  Eye,
  ArrowRight,
  Download,
  MessageSquare,
  Zap
} from 'lucide-react';

type BoutiqueSubTab = 'pos' | 'customers' | 'inventory' | 'orders' | 'analytics';

export const PosBoutique: React.FC = () => {
  const {
    products,
    cart,
    orders,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    checkoutCart,
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    settleStudentDebt,
    students,
    language,
    showToast
  } = useAdmin();

  // Active Boutique Sub-Tab
  const [activeTab, setActiveTab] = useState<BoutiqueSubTab>('pos');

  // POS State
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchCatalogTerm, setSearchCatalogTerm] = useState('');
  const [skuBarcodeInput, setSkuBarcodeInput] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({
    'PROD-01': '4.0 XXX',
    'PROD-02': 'M (Adult)',
    'PROD-03': 'Adult S/M',
    'PROD-04': 'M (38-40)',
    'PROD-05': 'Medium Tension',
  });
  const [paymentMode, setPaymentMode] = useState<'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt'>('cash');
  const [instapayRef, setInstapayRef] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'checkout'>('catalog');
  const [completedOrder, setCompletedOrder] = useState<BoutiqueOrder | null>(null);

  // Customer CRM State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<string | null>(null);
  const [customerSettleAmt, setCustomerSettleAmt] = useState('');
  // Person profile overlay
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  // Inventory Manager State
  const [inventorySearch, setInventorySearch] = useState('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  
  // New Product Form
  const [newTitle, setNewTitle] = useState('');
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newCategory, setNewCategory] = useState<ProductItem['category']>('apparel');
  const [newPrice, setNewPrice] = useState<number>(45.0);
  const [newSku, setNewSku] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVariantsString, setNewVariantsString] = useState('S: 10, M: 12, L: 8');

  // Order History State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [viewingReceipt, setViewingReceipt] = useState<BoutiqueOrder | null>(null);
  const catalogView = useViewPrefs('pos-catalog', 'cards');
  const inventoryView = useViewPrefs('pos-inventory', 'rows');
  const ordersView = useViewPrefs('pos-orders', 'rows');

  const handleExportCatalog = () => {
    exportCsv(`boutique-catalog-${new Date().toISOString().split('T')[0]}`, ['sku', 'title', 'category', 'price', 'stock'], filteredProducts.map((p) => ({
      sku: p.sku, title: p.title, category: p.category, price: p.price,
      stock: (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0),
    })));
    showToast(language === 'ar' ? 'تم تصدير الكتالوج' : 'Catalog exported', `${filteredProducts.length} rows → CSV`, 'success');
  };

  const handleExportOrders = () => {
    const list = orders.filter((o) => {
      if (orderPaymentFilter !== 'all' && o.paymentMethod !== orderPaymentFilter) return false;
      if (!orderSearch) return true;
      return o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.customerName.toLowerCase().includes(orderSearch.toLowerCase());
    });
    exportCsv(`boutique-orders-${new Date().toISOString().split('T')[0]}`, ['id', 'customerName', 'total', 'paymentMethod', 'date'], list.map((o) => ({
      id: o.id, customerName: o.customerName, total: o.total, paymentMethod: o.paymentMethod, date: o.timestamp || o.date,
    })));
    showToast(language === 'ar' ? 'تم تصدير الطلبات' : 'Orders exported', `${list.length} rows → CSV`, 'success');
  };

  // Cart calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleVariantChange = (productId: string, size: string) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: size }));
  };

  const handleAddToCart = (product: ProductItem) => {
    const size = selectedVariants[product.id] || product.variants[0]?.size || 'Standard';
    addToCart(product, size, 1);
  };

  // Quick SKU Barcode Scanner handler
  const handleSkuScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = skuBarcodeInput.trim().toUpperCase();
    if (!clean) { showToast('Empty scan', 'Scan or type a SKU first.', 'error'); return; }
    if (clean.length < 2) { showToast('Invalid scan', 'SKU must be at least 2 characters.', 'error'); return; }

    const matchedProd = products.find(
      (p) => p.sku.toUpperCase() === clean || p.id.toUpperCase() === clean
    ) || products.find((p) => p.title.toUpperCase().includes(clean) && clean.length >= 4);

    if (matchedProd) {
      handleAddToCart(matchedProd);
      showToast('Scanned to Cart', `${matchedProd.title} added via barcode scan.`, 'success');
      setSkuBarcodeInput('');
    } else {
      showToast('SKU Not Found', `No store item matched barcode "${clean}".`, 'error');
    }
  };

  const activeStudentId = paymentMode === 'wallet_debt' && selectedCustomerId === 'walkin'
    ? (students[0]?.id || '')
    : selectedCustomerId;
  const selectedStudentObj = students.find((s) => s.id === activeStudentId);
  const projectedBalance = selectedStudentObj
    ? selectedStudentObj.walletBalance - totalAmount
    : 0;

  const handleCompleteOrder = () => {
    if (cart.length === 0) { showToast('Empty cart', 'Add items before checkout.', 'error'); return; }

    const targetStudentId = selectedCustomerId !== 'walkin'
      ? selectedCustomerId
      : (paymentMode === 'wallet_debt' ? (students[0]?.id || undefined) : undefined);

    if (paymentMode === 'wallet_debt' && !targetStudentId) {
      showToast('Student required', 'Select a student account to charge on credit.', 'error');
      return;
    }

    const studentObj = targetStudentId ? students.find((s) => s.id === targetStudentId) : undefined;
    const customerPhone = studentObj ? studentObj.parentPhone : walkInPhone.trim();
    const customerName = studentObj ? studentObj.name : (walkInName.trim() || 'Walk-in Patron');

    const res = checkoutCart(paymentMode, targetStudentId, customerPhone, customerName);
    if (!res.success) {
      showToast('Checkout failed', res.error || 'Could not complete order.', 'error');
      return;
    }
    if (res.success && res.order) {
      setCompletedOrder(res.order);
      setMobileTab('catalog');
      setWalkInPhone('');
      setWalkInName('');
    }
  };

  // Filtered Catalog
  const filteredProducts = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch =
      searchCatalogTerm === '' ||
      p.title.toLowerCase().includes(searchCatalogTerm.toLowerCase()) ||
      p.titleAr.includes(searchCatalogTerm) ||
      p.sku.toLowerCase().includes(searchCatalogTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Handle Add Product Submit
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newTitle.trim().length < 2) { showToast('Cannot save', 'Product title is required (min 2 chars).', 'error'); return; }
    if (!newSku.trim()) { showToast('Cannot save', 'SKU is required and must be unique.', 'error'); return; }
    if (products.some((p) => p.sku.toUpperCase() === newSku.trim().toUpperCase())) {
      showToast('Duplicate SKU', `SKU ${newSku.trim().toUpperCase()} already exists.`, 'error');
      return;
    }
    const priceNum = Number(newPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 1000000) {
      showToast('Cannot save', 'Price must be greater than 0.', 'error');
      return;
    }
    if (newImageUrl.trim()) {
      try {
        const u = new URL(newImageUrl.trim());
        if (!['http:', 'https:'].includes(u.protocol)) { showToast('Cannot save', 'Image URL must start with http(s)://.', 'error'); return; }
      } catch { showToast('Cannot save', 'Image URL is not valid.', 'error'); return; }
    }

    // Parse variants: "S: 10, M: 12"
    const parsedVariants: ProductVariant[] = newVariantsString.split(',').map((part) => {
      const [size, stock] = part.split(':').map((s) => s.trim());
      const stockNum = parseInt(stock);
      return {
        size: size || 'Standard',
        stock: Number.isFinite(stockNum) && stockNum >= 0 && stockNum <= 10000 ? stockNum : 10,
      };
    }).filter((v) => v.size.length > 0);

    addProduct({
      title: newTitle.trim(),
      titleAr: newTitleAr.trim() || newTitle.trim(),
      category: newCategory,
      price: Number(newPrice) || 30.0,
      sku: newSku.trim().toUpperCase(),
      imageUrl:
        newImageUrl.trim() ||
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80',
      variants: parsedVariants.length > 0 ? parsedVariants : [{ size: 'Standard', stock: 15 }],
    });

    setIsAddProductModalOpen(false);
    setNewTitle('');
    setNewTitleAr('');
    setNewSku('');
    setNewImageUrl('');
  };

  // Handle Edit Product Stock
  const handleSaveProductEdit = () => {
    if (!editingProduct) return;
    if (!editingProduct.title.trim()) { showToast('Cannot save', 'Product title cannot be empty.', 'error'); return; }
    if (!editingProduct.sku.trim()) { showToast('Cannot save', 'SKU cannot be empty.', 'error'); return; }
    if (products.some((p) => p.id !== editingProduct.id && p.sku.toUpperCase() === editingProduct.sku.trim().toUpperCase())) {
      showToast('Duplicate SKU', 'Another product already uses this SKU.', 'error');
      return;
    }
    if (!Number.isFinite(Number(editingProduct.price)) || Number(editingProduct.price) <= 0) {
      showToast('Cannot save', 'Price must be greater than 0.', 'error');
      return;
    }
    updateProduct(editingProduct.id, { ...editingProduct, title: editingProduct.title.trim(), sku: editingProduct.sku.trim().toUpperCase(), price: Number(editingProduct.price) });
    setEditingProduct(null);
  };

  // Customers calculation for Customer CRM tab
  const customerList = students.map((student) => {
    const studentOrders = orders.filter((o) => o.studentId === student.id);
    const totalSpent = studentOrders.reduce((sum, o: any) => sum + Number(o?.total ?? o?.totalAmount ?? 0), 0);
    return {
      student,
      orders: studentOrders,
      totalSpent,
      lastOrder: studentOrders[0] || null,
    };
  });

  const filteredCustomers = customerList.filter((c) => {
    if (!customerSearch) return true;
    const term = customerSearch.toLowerCase();
    return (
      c.student.name.toLowerCase().includes(term) ||
      c.student.parentName.toLowerCase().includes(term) ||
      c.student.parentPhone.includes(term) ||
      c.student.familyId.toLowerCase().includes(term)
    );
  });

  // Analytics Metrics
  const totalBoutiqueRevenue = orders.reduce((sum, o: any) => sum + Number(o?.total ?? o?.totalAmount ?? 0), 0);
  const estimatedGrossMargin = totalBoutiqueRevenue * 0.45;
  const totalItemsSold = orders.reduce(
    (sum, o: any) => sum + (Array.isArray(o?.items) ? o.items.reduce((iSum: number, it: any) => iSum + Number(it?.quantity ?? 1), 0) : 0),
    0
  );
  const totalInventoryUnits = products.reduce(
    (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.stock, 0),
    0
  );

  if (viewingStudentId) {
    return (
      <StudentProfilePage
        studentId={viewingStudentId}
        onBack={() => setViewingStudentId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      
      {/* Top Header & Branding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/etoile-wordmark-logo.png"
              alt="Étoile Ballet Academy"
              className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(202,168,104,0.25)]"
            />
            <span className="text-xs text-rose-400 uppercase tracking-widest border-l border-rose-500/30 pl-2">
              {language === 'ar' ? 'نظام إدارة متجر البوتيك ونقاط البيع' : 'Store & Cash Register (POS)'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {language === 'ar'
              ? 'إدارة المنتجات، مبيعات الباليه، سجل حسابات العملاء، ومحفظة الديون الآجلة.'
              : 'Manage store products, sales checkout, customer balances, and order receipts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#171d2b] border border-white/10 text-xs text-slate-300 font-mono">
            Catalog: {products.length} items ({totalInventoryUnits} units)
          </span>
          <span className="status-pill-emerald px-3 py-1.5 rounded-xl text-xs font-bold">
            Sales: {formatCurrency(totalBoutiqueRevenue, language)}
          </span>
        </div>
      </div>

      {/* =========================================================================
          BOUTIQUE CRM SUB-TABS NAVIGATION & WORKSPACE
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <ModuleSubSidebar<BoutiqueSubTab>
          activeId={activeTab}
          onChange={setActiveTab}
          language={language}
          title="Store"
          titleAr="إدارة متجر البوتيك"
          items={[
            {
              id: 'pos',
              label: 'Cash Register / POS',
              labelAr: 'نقطة البيع والكاشير',
              icon: <Scan className="w-4 h-4" />,
              count: cart.length > 0 ? cart.reduce((s, i) => s + i.quantity, 0) : undefined,
            },
            {
              id: 'customers',
              label: 'Customers',
              labelAr: 'سجل حسابات العملاء',
              icon: <Users className="w-4 h-4" />,
            },
            {
              id: 'inventory',
              label: 'Inventory & Products',
              labelAr: 'إدارة المخزون والمنتجات',
              icon: <Package className="w-4 h-4" />,
              count: products.length,
            },
            {
              id: 'orders',
              label: 'Order History',
              labelAr: 'سجل فواتير المبيعات',
              icon: <FileText className="w-4 h-4" />,
              count: orders.length,
            },
            {
              id: 'analytics',
              label: 'Sales Reports',
              labelAr: 'مؤشرات الأداء والأرباح',
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ]}
          actionButton={
            activeTab === 'inventory'
              ? {
                  label: 'Add Product',
                  labelAr: 'إضافة منتج جديد',
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setIsAddProductModalOpen(true),
                }
              : undefined
          }
        />

        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* =========================================================================
          TAB 1: POS CHECKOUT TERMINAL
          ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          
          {/* Barcode Quick Scan Bar */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
              <Scan className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  {language === 'ar' ? 'ماسح باركود المنتجات السريع' : 'Product Barcode Scanner'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Scan product barcode or enter code to add to cart
                </span>
              </div>
            </div>

            <form onSubmit={handleSkuScanSubmit} className="flex gap-2 w-full sm:w-80">
              <input
                type="text"
                value={skuBarcodeInput}
                onChange={(e) => setSkuBarcodeInput(e.target.value)}
                placeholder="Scan or type SKU (e.g. GRISH-2007)..."
                className="flex-1 bg-[#111622] border border-white/10 focus:border-rose-500/50 text-white px-3 py-2 rounded-xl text-xs font-mono tracking-wider uppercase shadow-inner"
              />
              <button type="submit" className="action-btn-coral px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm">
                Add
              </button>
            </form>
          </div>

          {/* Catalog Categories & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'pointe_shoes', label: 'Pointe Shoes' },
                { id: 'leotards', label: 'Leotards' },
                { id: 'tights', label: 'Tights' },
                { id: 'apparel', label: 'Warm-Ups' },
                { id: 'accessories', label: 'Accessories' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'nav-pill-active bg-white text-slate-950 shadow-md shadow-white/10'
                      : 'bg-[#171d2b] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog or SKU..."
                value={searchCatalogTerm}
                onChange={(e) => setSearchCatalogTerm(e.target.value)}
                className="w-full bg-[#111622] border border-white/10 focus:border-rose-500/50 text-white pl-9 pr-9 py-1.5 rounded-xl text-xs shadow-inner"
                aria-label="Search catalog"
              />
              {searchCatalogTerm && (
                <button onClick={() => setSearchCatalogTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5" aria-label="Clear search">✕</button>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-500">{filteredProducts.length}/{products.length}</span>
            <ViewSwitcher moduleKey="pos-catalog" modes={['cards', 'rows']} value={{ mode: catalogView.mode, density: catalogView.density }} onChange={(p) => { catalogView.setMode(p.mode); catalogView.setDensity(p.density); }} />
            <button onClick={handleExportCatalog} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 flex-shrink-0" title="Export CSV">
              <Download className="w-3.5 h-3.5" /><span>CSV</span>
            </button>
          </div>

          {/* POS Layout: 2 Columns (Catalog on Left, Cart & Checkout on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Product Cards / Rows */}
            {catalogView.mode === 'rows' ? (
              <div className="lg:col-span-8 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-[#171d2b] self-start">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No products match.</div>
                ) : (
                  filteredProducts.map((product) => {
                    const activeSize = selectedVariants[product.id] || product.variants[0]?.size || 'Standard';
                    const stock = product.variants.find((v) => v.size === activeSize)?.stock ?? 0;
                    return (
                      <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition">
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-white truncate">{product.title}</span>
                          <span className="block text-[10px] font-mono text-slate-500">{product.sku} • {product.category} • {formatCurrency(product.price, language)}</span>
                        </span>
                        <span className={`text-[10px] font-mono flex-shrink-0 ${stock <= 3 ? 'text-amber-400' : 'text-slate-400'}`}>{stock} left</span>
                        <button onClick={() => handleAddToCart(product)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex-shrink-0">Add</button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const activeSize = selectedVariants[product.id] || product.variants[0]?.size || 'Standard';
                const currentVariantStock =
                  product.variants.find((v) => v.size === activeSize)?.stock ?? 0;

                return (
                  <div
                    key={product.id}
                    className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-rose-500/40 transition group"
                  >
                    <div>
                      <div className="relative h-36 bg-[#111622] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-mono bg-black/75 text-rose-400 border border-rose-500/30 font-bold">
                          {product.sku}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-heading text-xs font-semibold text-white line-clamp-2">
                            {product.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-sm text-rose-400">
                            {formatCurrency(product.price, language)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              currentVariantStock <= 3
                                ? 'status-pill-pink'
                                : 'status-pill-emerald'
                            }`}
                          >
                            {currentVariantStock} in stock
                          </span>
                        </div>

                        {/* Variant Size Selector */}
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Select Variant / Size:</label>
                          <select
                            value={activeSize}
                            onChange={(e) => handleVariantChange(product.id, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50 cursor-pointer shadow-inner"
                          >
                            {product.variants.map((v) => (
                              <option key={v.size} value={v.size}>
                                {v.size} ({v.stock} avail)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 pt-0">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={currentVariantStock <= 0}
                        className={`w-full py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                          currentVariantStock > 0
                            ? 'action-btn-coral'
                            : 'bg-[#1c2333] text-slate-500 border border-white/5 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{currentVariantStock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-slate-400 italic">
                  No store items match your search.
                </div>
              )}
            </div>
            )}

            {/* Right: Cart & Unified Checkout */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 sticky top-20">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-rose-400" />
                    <h3 className="font-heading text-sm font-semibold text-white">
                      {language === 'ar' ? 'سلة المشتريات الحالية' : 'Active Checkout Cart'}
                    </h3>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={`${item.product.id}-${item.size}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c2333] border border-white/5 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <strong className="block text-white truncate">{item.product.title}</strong>
                        <span className="text-[10px] text-slate-400">Size: {item.size} • {formatCurrency(item.product.price, language)} ea</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 border border-white/10 rounded-lg bg-[#111622]">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, item.size, item.quantity - 1)}
                            className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs px-1 text-white">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const variant = item.product.variants.find((v) => v.size === item.size);
                              const stock = variant ? variant.stock : 9999;
                              if (item.quantity + 1 > stock) { showToast('No stock', `Only ${stock} available in size ${item.size}.`, 'error'); return; }
                              updateCartQuantity(item.product.id, item.size, item.quantity + 1);
                            }}
                            className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-bold text-rose-400 w-16 text-right">
                          {formatCurrency(item.product.price * item.quantity, language)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id, item.size)}
                          className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cart.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Cart is empty. Select items from catalog or scan a SKU.
                    </div>
                  )}
                </div>

                {/* Subtotal & Total */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-200">{formatCurrency(totalAmount, language)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <span>Total Amount:</span>
                    <span className="font-mono text-lg text-rose-400">{formatCurrency(totalAmount, language)}</span>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-white">
                      {language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'}
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {language === 'ar' ? '🏬 حساب المتجر' : '🏬 Store Safe'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'cash'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/10'
                          : 'border-white/10 bg-[#1c2333] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'ar' ? 'نقداً (كاش)' : 'Cash'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('instapay')}
                      className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'instapay'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/10'
                          : 'border-white/10 bg-[#1c2333] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>{language === 'ar' ? 'إنستاباي (InstaPay)' : 'InstaPay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('wallet_debt')}
                      className={`col-span-2 p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'wallet_debt'
                          ? 'border-purple-400 bg-purple-500/15 text-purple-300 shadow-sm'
                          : 'border-white/10 bg-[#1c2333] text-slate-400 hover:text-white'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-purple-400" />
                      <span>{language === 'ar' ? 'خصم من حساب/محفظة الطالب' : 'Charge to Student Negative Wallet'}</span>
                    </button>
                  </div>

                  {paymentMode === 'instapay' && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                        <span>{language === 'ar' ? 'مرجع تحويل إنستاباي (اختياري):' : 'InstaPay Reference / Sender:'}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. INSTA-9812 / 010xxxxxxxx"
                        value={instapayRef}
                        onChange={(e) => setInstapayRef(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-[#111622] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span>{language === 'ar' ? 'يودع الإيراد تلقائياً في حساب المتجر (Store Safe)' : 'Deposited directly into Store Safe Account'}</span>
                  </div>
                </div>

                {/* Customer & WhatsApp Receipt Panel */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'ar' ? 'العميل وإيصال واتساب' : 'Customer & WhatsApp Receipt'}</span>
                    </label>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {language === 'ar' ? 'إرسال تلقائي' : 'Auto-Receipt'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {paymentMode === 'wallet_debt'
                        ? (language === 'ar' ? 'اختر حساب الطالب (مطلوب للخصم على الرصيد):' : 'Select Student Account (Required for credit):')
                        : (language === 'ar' ? 'ربط بطالب أو عميل خارجي:' : 'Attach Student or Walk-in Customer:')}
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#111622] border border-white/10 text-white focus:outline-none focus:border-rose-500/50"
                    >
                      {paymentMode !== 'wallet_debt' && (
                        <option value="walkin">🛍️ {language === 'ar' ? 'عميل المتجر (أدخل الهاتف بالأسفل)' : 'Walk-in Patron (Enter phone below)'}</option>
                      )}
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          👤 {s.name} ({s.parentPhone || 'No phone'} — {formatCurrency(s.walletBalance, language)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* When enrolled student is selected */}
                  {selectedCustomerId !== 'walkin' && selectedStudentObj && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-emerald-300 font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'ar' ? 'هاتف إيصال واتساب:' : 'WhatsApp Target:'}</span>
                        </span>
                        <span className="font-mono">{selectedStudentObj.parentPhone || 'No phone'}</span>
                      </div>
                      {paymentMode === 'wallet_debt' && (
                        <div className="pt-1 border-t border-emerald-500/20 text-amber-300 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{language === 'ar' ? 'الرصيد الحالي:' : 'Current Balance:'}</span>
                            <span className="font-mono">{formatCurrency(selectedStudentObj.walletBalance, language)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>{language === 'ar' ? 'الرصيد بعد الخصم:' : 'Projected Balance:'}</span>
                            <span className="font-mono text-amber-200">{formatCurrency(projectedBalance, language)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-amber-400/80">
                            <span>{language === 'ar' ? 'حد الائتمان:' : 'Negative Ceiling:'}</span>
                            <span className="font-mono">-{formatCurrency(selectedStudentObj.maxNegativeDebt, language)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* When walk-in patron is selected */}
                  {selectedCustomerId === 'walkin' && paymentMode !== 'wallet_debt' && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">{language === 'ar' ? 'اسم العميل:' : 'Customer Name:'}</label>
                          <input
                            type="text"
                            placeholder={language === 'ar' ? 'مشتري المتجر' : 'e.g. Sarah Smith'}
                            value={walkInName}
                            onChange={(e) => setWalkInName(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-[#111622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">{language === 'ar' ? 'رقم واتساب للإيصال:' : 'WhatsApp Phone:'}</label>
                          <input
                            type="tel"
                            placeholder="+201xxxxxxxxx"
                            value={walkInPhone}
                            onChange={(e) => setWalkInPhone(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-[#111622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 font-mono"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span>{language === 'ar' ? 'سيتم إرسال إيصال الشراء الفوري على رقم واتساب هذا فور إتمام الدفع.' : 'Receipt will be dispatched to this WhatsApp instantly upon checkout.'}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Checkout Submit */}
                <button
                  type="button"
                  onClick={handleCompleteOrder}
                  disabled={cart.length === 0}
                  className={`w-full py-3 rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    cart.length > 0
                      ? 'action-btn-coral'
                      : 'bg-[#1c2333] text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {paymentMode === 'wallet_debt' ? 'Charge Account & Issue Receipt' : 'Complete Sale & Print Receipt'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CUSTOMER ACCOUNTS & CLIENT CRM
          ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                {language === 'ar' ? 'سجل حسابات عملاء المتجر' : 'Customer Accounts'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'متابعة سجل المشتريات والمديونيات والحسابات لجميع راقصات وأولياء أمور الأكاديمية.'
                  : "Track each dancer and family's retail spend history, negative wallet credit, and purchases."}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث باسم الطالبة، ولي الأمر، الهاتف...' : 'Search by student, parent, phone...'}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(({ student, orders: cOrders, totalSpent }) => (
              <div
                key={student.id}
                className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 shadow-sm space-y-3 hover:border-amber-400/40 transition group"
              >
                <button
                  onClick={() => setViewingStudentId(student.id)}
                  title={language === 'ar' ? 'فتح صفحة الطالب' : 'Open student page'}
                  className="flex items-start gap-3 text-start w-full rounded-xl p-1 -m-1 hover:bg-white/[0.04] transition cursor-pointer group/poscustomer"
                >
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-12 h-12 rounded-xl object-cover border border-amber-400/30 flex-shrink-0 group-hover/poscustomer:border-amber-300 transition"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading text-sm font-bold text-white truncate group-hover/poscustomer:text-amber-300 transition">
                      {student.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {student.level} • Family: {student.familyId}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {student.parentName} ({student.parentPhone})
                    </span>
                  </div>
                </button>

                {/* Metrics Box */}
                <div className="grid grid-cols-2 gap-2 bg-[#111622] p-2.5 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Spent'}</span>
                    <strong className="font-mono text-amber-300 font-bold">{formatCurrency(totalSpent, language)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">{language === 'ar' ? 'الرصيد الدفتري' : 'Ledger Balance'}</span>
                    <strong
                      className={`font-mono font-bold ${
                        student.walletBalance < 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(student.walletBalance, language)}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {cOrders.length} {cOrders.length === 1 ? 'order' : 'orders'} on record
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerForHistory(student.id);
                      setActiveTab('orders');
                      setOrderSearch(student.name);
                    }}
                    className="text-xs text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>{language === 'ar' ? 'عرض الفواتير' : 'View Orders'}</span>
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: INVENTORY & PRODUCTS MANAGER
          ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                {language === 'ar' ? 'إدارة كتالوج ومنتجات البوتيك' : 'Inventory Management'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'إدارة ملابس وتجهيزات الباليه، أحذية البوانت، المقاسات ونقاط إعادة الطلب.'
                  : 'Manage retail attire, pointe shoes, variant sizing, and restock levels.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث في المخزون...' : 'Search inventory...'}
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl text-xs w-56 focus:outline-none focus:border-amber-400/50"
                aria-label={language === 'ar' ? 'بحث المخزون' : 'Search inventory'}
              />
              <ViewSwitcher moduleKey="pos-inventory" modes={['table', 'rows']} value={{ mode: inventoryView.mode, density: inventoryView.density }} onChange={(p) => { inventoryView.setMode(p.mode); inventoryView.setDensity(p.density); }} />
              <button
                type="button"
                onClick={handleExportCatalog}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="action-btn-coral px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}</span>
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111622] border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">{language === 'ar' ? 'المنتج والكود' : 'Product & SKU'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'سعر البيع' : 'Retail Price'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المقاسات والمخزون' : 'Variants & Stocks'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الباركود' : 'Barcode'}</th>
                    <th className="p-3.5 text-right">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {products
                    .filter((p) => {
                      if (!inventorySearch) return true;
                      const term = inventorySearch.toLowerCase();
                      return (
                        p.title.toLowerCase().includes(term) ||
                        p.sku.toLowerCase().includes(term) ||
                        p.category.includes(term)
                      );
                    })
                    .map((prod) => {
                      const totalStock = prod.variants.reduce((s, v) => s + v.stock, 0);
                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.03] transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.imageUrl}
                                alt={prod.title}
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                              />
                              <div>
                                <strong className="block text-white font-medium">{prod.title}</strong>
                                <span className="font-mono text-[10px] text-amber-300 font-bold">{prod.sku}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="capitalize px-2.5 py-1 rounded-md bg-[#1c2333] border border-white/5 text-[11px] text-slate-300">
                              {prod.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-300">
                            {formatCurrency(prod.price, language)}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {prod.variants.map((v) => (
                                <span
                                  key={v.size}
                                  className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                                    v.stock <= 3
                                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold'
                                      : 'bg-[#1c2333] text-slate-300 border-white/10'
                                  }`}
                                >
                                  {v.size}: <strong>{v.stock}</strong>
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Total: {totalStock} units
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="bg-white p-1 rounded inline-block shadow">
                              <BarcodeSVG value={prod.sku} width={100} height={26} showText={false} lightBackground />
                            </div>
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(prod)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5 transition cursor-pointer"
                              title="Edit product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (window.confirm(`Delete ${prod.title} from catalog?`)) deleteProduct(prod.id); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SALES ORDER LEDGER
          ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                {language === 'ar' ? 'سجل فواتير مبيعات المتجر' : 'Sales History'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'أرشيف جميع عمليات الدفع المكتملة وخصومات حسابات الطالبات والفواتير الصادرة.'
                  : 'Audit history of all completed checkouts, student debt charges, and transactions.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={orderPaymentFilter}
                onChange={(e) => setOrderPaymentFilter(e.target.value)}
                className="bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400/50"
                aria-label="Payment method"
              >
                <option value="all">All Payment Modes</option>
                <option value="card">Card Only</option>
                <option value="cash">Cash Only</option>
                <option value="wallet_debt">Student Debt Only</option>
              </select>

              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث برقم الفاتورة أو الاسم...' : 'Filter by Order ID or Name...'}
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl text-xs w-52 focus:outline-none focus:border-amber-400/50"
                aria-label={language === 'ar' ? 'بحث الطلبات' : 'Search orders'}
              />
              <ViewSwitcher moduleKey="pos-orders" modes={['table', 'rows']} value={{ mode: ordersView.mode, density: ordersView.density }} onChange={(p) => { ordersView.setMode(p.mode); ordersView.setDensity(p.density); }} />
              <button onClick={handleExportOrders} className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5" title="Export CSV">
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111622] border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">{language === 'ar' ? 'رقم الفاتورة' : 'Order ID'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'العميل / الراقصة' : 'Customer / Dancer'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'العناصر المباعة' : 'Items Purchased'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الإجمالي' : 'Total Amount'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المسؤول' : 'Cashier'}</th>
                    <th className="p-3.5 text-right">{language === 'ar' ? 'إيصال' : 'Receipt'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {orders
                    .filter((o) => {
                      const matchesPayment = orderPaymentFilter === 'all' || o.paymentMethod === orderPaymentFilter;
                      const matchesSearch =
                        !orderSearch ||
                        o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        (o.studentName && o.studentName.toLowerCase().includes(orderSearch.toLowerCase()));
                      return matchesPayment && matchesSearch;
                    })
                    .map((order: any) => (
                      <tr key={order.id} className="hover:bg-white/[0.03] transition">
                        <td className="p-3.5 font-mono font-bold text-amber-300">{order.orderNumber || order.id}</td>
                        <td className="p-3.5 text-slate-400">{order.timestamp || order.createdAt || order.date}</td>
                        <td className="p-3.5 font-medium text-white">{order.customerName}</td>
                        <td className="p-3.5">
                          <span className="text-[11px] text-slate-400">
                            {(Array.isArray(order.items) ? order.items : []).map((i: any) => `${i?.product?.title || i?.title || 'Item'} (${i?.size || 'STD'}) × ${i?.quantity ?? 1}`).join(', ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={order.paymentMethod === 'wallet_debt' ? 'status-pill-amber' : 'status-pill-emerald'}
                          >
                            {order.paymentMethod === 'wallet_debt' ? 'Debt Ledger' : order.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sm text-amber-300">
                          {formatCurrency((order as any).total ?? (order as any).totalAmount ?? 0, language)}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{order.processedBy}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(order)}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-amber-400/50 bg-[#1c2333] text-xs text-white inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-300" />
                            <span>{language === 'ar' ? 'فاتورة' : 'Receipt'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate-500 italic">
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: BOUTIQUE ANALYTICS
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Retail Revenue'}</span>
              <span className="font-heading text-2xl font-bold text-amber-300 block font-mono">
                {formatCurrency(totalBoutiqueRevenue, language)}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">All completed transactions</span>
            </div>

            <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold">{language === 'ar' ? 'هامش الربح التقديري' : 'Recognized Margin'}</span>
              <span className="font-heading text-2xl font-bold text-emerald-400 block font-mono">
                {formatCurrency(estimatedGrossMargin, language)}
              </span>
              <span className="text-[10px] text-slate-400">45% academy markup margin</span>
            </div>

            <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold">{language === 'ar' ? 'القطع المباعة' : 'Total Units Dispensed'}</span>
              <span className="font-heading text-2xl font-bold text-white block font-mono">
                {totalItemsSold} items
              </span>
              <span className="text-[10px] text-slate-400">Pointe shoes, leotards, tights</span>
            </div>

            <div className="kpi-gradient-card rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold">{language === 'ar' ? 'تقييم المخزون الحالي' : 'Inventory Valuation'}</span>
              <span className="font-heading text-2xl font-bold text-sky-400 block font-mono">
                {formatCurrency(products.reduce((sum, p) => sum + p.price * p.variants.reduce((vs, v) => vs + v.stock, 0), 0), language)}
              </span>
              <span className="text-[10px] text-slate-400">{totalInventoryUnits} units in stock</span>
            </div>
          </div>

          {/* Top Selling Products Breakdown */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{language === 'ar' ? 'المنتجات الأكثر طلباً ومبيعاً' : 'Top Sellers'}</span>
            </h3>

            <div className="space-y-3">
              {products.map((product) => {
                const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#1c2333] border border-white/5 text-xs hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-11 h-11 rounded-lg object-cover border border-white/10"
                      />
                      <div>
                        <strong className="block text-white font-medium text-sm">{product.title}</strong>
                        <span className="text-[11px] text-slate-400">SKU: <span className="font-mono text-amber-300">{product.sku}</span></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-amber-300 block">{formatCurrency(product.price, language)}</span>
                      <span className="text-[11px] text-slate-400">{totalStock} units available</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RECEIPT MODAL (Completed Order or Re-print)
          ========================================================================= */}
      {(completedOrder || viewingReceipt) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-amber-400/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-slate-200">
            {/* Receipt Header */}
            <div className="text-center space-y-1.5 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 font-heading font-black flex items-center justify-center text-lg mx-auto shadow-lg shadow-amber-400/20">
                É
              </div>
              <h3 className="font-heading text-lg font-bold text-white tracking-wide">
                ÉTOILE BALLET ACADEMY
              </h3>
              <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-widest">
                Official Store Receipt
              </p>
              <span className="font-mono text-xs text-slate-400 block">
                Order #{completedOrder?.id || viewingReceipt?.id} • {completedOrder?.date || viewingReceipt?.date}
              </span>
            </div>

            {/* Customer & Payment Info */}
            <div className="bg-[#111622] p-4 rounded-xl border border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <strong className="text-white">
                  {completedOrder?.customerName || viewingReceipt?.customerName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode:</span>
                <span className="uppercase font-semibold text-amber-300 font-mono">
                  {completedOrder?.paymentMethod || viewingReceipt?.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cashier:</span>
                <span className="text-slate-300 font-medium">
                  {completedOrder?.processedBy || viewingReceipt?.processedBy}
                </span>
              </div>
            </div>

            {/* Itemized list */}
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs divide-y divide-white/5">
              {(completedOrder?.items || (viewingReceipt as any)?.items || []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between pt-2">
                  <div>
                    <strong className="block text-white">{it?.product?.title || it?.title || 'Item'}</strong>
                    <span className="text-[10px] text-slate-400">Size: {it?.size || 'STD'} × {it?.quantity ?? 1}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">
                    {formatCurrency(Number(it?.product?.price ?? it?.price ?? 0) * Number(it?.quantity ?? 1), language)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-bold">
              <span className="text-slate-300">Total Paid:</span>
              <span className="font-mono text-2xl text-amber-300">
                {formatCurrency((completedOrder as any)?.total ?? (completedOrder as any)?.totalAmount ?? (viewingReceipt as any)?.total ?? (viewingReceipt as any)?.totalAmount ?? 0, language)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="action-btn-coral flex-1 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  setViewingReceipt(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] text-xs text-white font-semibold border border-white/10 cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD PRODUCT MODAL
          ========================================================================= */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-300" />
                <span>{language === 'ar' ? 'إضافة منتج جديد للمتجر' : 'Add Product'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Title (English) *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Bloch Heritage Pointe Shoes"
                  className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Title (Arabic)</label>
                <input
                  type="text"
                  value={newTitleAr}
                  onChange={(e) => setNewTitleAr(e.target.value)}
                  placeholder="حذاء باليه بلوتش هيريتيدج"
                  className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl font-arabic focus:outline-none focus:border-amber-400/50"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="pointe_shoes">Pointe Shoes</option>
                    <option value="leotards">Leotards</option>
                    <option value="tights">Tights</option>
                    <option value="apparel">Apparel & Warm-Ups</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{language === 'ar' ? 'السعر (ج.م) *' : 'Price (EGP) *'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">SKU / Barcode *</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                    placeholder="e.g. BLOCH-HERITAGE-01"
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl font-mono uppercase focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Image URL</label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash..."
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Size Variants & Stock (format: "Size: Stock, ...")
                </label>
                <input
                  type="text"
                  value={newVariantsString}
                  onChange={(e) => setNewVariantsString(e.target.value)}
                  placeholder="S: 10, M: 12, L: 8"
                  className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="action-btn-coral flex-1 py-2.5 rounded-xl font-bold cursor-pointer shadow-lg">
                  {language === 'ar' ? 'تسجيل المنتج في المخزون' : 'Register Item in Inventory'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-slate-200 cursor-pointer transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT PRODUCT MODAL
          ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171d2b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-heading text-lg font-bold text-white">
                {language === 'ar' ? 'تعديل المنتج وأرصدة المخزون' : 'Edit Product & Stock Counts'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{language === 'ar' ? 'سعر البيع (ج.م)' : 'Retail Price (EGP)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">SKU / Code</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl font-mono uppercase focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              {/* Variant Stock Editors */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">Variant Stock Levels:</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editingProduct.variants.map((variant, idx) => (
                    <div key={variant.size} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111622] border border-white/5">
                      <span className="font-semibold text-white">{variant.size}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Units:</span>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updatedVariants = [...editingProduct.variants];
                            updatedVariants[idx] = { ...variant, stock: Math.max(0, val) };
                            setEditingProduct({ ...editingProduct, variants: updatedVariants });
                          }}
                          className="w-20 bg-[#171d2b] border border-white/10 text-white px-2 py-1 rounded-lg text-xs font-mono text-right focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleSaveProductEdit}
                  className="action-btn-coral flex-1 py-2.5 rounded-xl font-bold cursor-pointer shadow-lg"
                >
                  {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#1c2333] hover:bg-[#222a3d] border border-white/10 text-slate-200 cursor-pointer transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
    </div>
    </div>
  );
};
