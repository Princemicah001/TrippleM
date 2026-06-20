import React, { useState } from 'react';
import {
  Briefcase,
  Layers,
  MapPin,
  Trash2,
  Plus,
  Edit2,
  PackageCheck,
  AlertCircle,
  Package,
  TrendingUp,
  Sliders,
  X
} from 'lucide-react';
import { Business, Product } from '../types';

interface OwnerBranchesProps {
  businesses: Business[];
  products: Product[];
  onAddBranch: (name: string, location: string) => void;
  onEditBranch: (id: string, name: string, location: string, status: 'active' | 'inactive') => void;
  onDeleteBranch: (id: string) => void;
  onAddProduct: (bizId: string, name: string, price: number, stock: number, purchasePrice?: number) => void;
  onDeleteProduct: (prodId: string) => void;
  onRestockProduct: (prodId: string, addedQty: number, totalCost: number) => void;
  onShowToast: (msg: string, isError?: boolean) => void;
  currencySymbol?: string;
  lowStockThreshold?: number;
}

export default function OwnerBranches({
  businesses,
  products,
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  onAddProduct,
  onDeleteProduct,
  onRestockProduct,
  onShowToast,
  currencySymbol = 'KSh',
  lowStockThreshold = 15,
}: OwnerBranchesProps) {
  // Modal states managed locally for inline popup inputs
  const [modalType, setModalType] = useState<'add_biz' | 'edit_biz' | 'add_prod' | 'restock' | null>(null);
  
  // Selected IDs for edits
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);

  // Deletion protective modal states
  const [branchToDelete, setBranchToDelete] = useState<Business | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form Fields
  const [bizName, setBizName] = useState('');
  const [bizLoc, setBizLoc] = useState('');
  const [bizStatus, setBizStatus] = useState<'active' | 'inactive'>('active');

  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState<number | ''>('');
  const [prodStock, setProdStock] = useState<number | ''>('');
  const [prodPurchasePrice, setProdPurchasePrice] = useState<number | ''>('');
  const [purchasePriceMode, setPurchasePriceMode] = useState<'unit' | 'bulk'>('unit');
  const [prodBulkPrice, setProdBulkPrice] = useState<number | ''>('');

  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockCost, setRestockCost] = useState<number | ''>('');

  const formatCurrency = (val: number) => {
    return currencySymbol + ' ' + (val || 0).toLocaleString('en-US');
  };

  const openAddBiz = () => {
    setBizName('');
    setBizLoc('');
    setModalType('add_biz');
  };

  const handleAddBizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !bizLoc.trim()) {
      onShowToast('Name and Location cannot be empty', true);
      return;
    }
    onAddBranch(bizName, bizLoc);
    setModalType(null);
  };

  const openEditBiz = (biz: Business) => {
    setSelectedBiz(biz);
    setBizName(biz.name);
    setBizLoc(biz.location);
    setBizStatus(biz.status);
    setModalType('edit_biz');
  };

  const handleEditBizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;
    if (!bizName.trim() || !bizLoc.trim()) {
      onShowToast('Name and Location cannot be empty', true);
      return;
    }
    onEditBranch(selectedBiz.id, bizName, bizLoc, bizStatus);
    setModalType(null);
  };

  const openAddProd = (bizId: string) => {
    const targetBiz = businesses.find((b) => b.id === bizId);
    if (targetBiz) setSelectedBiz(targetBiz);
    setProdName('');
    setProdPrice('');
    setProdStock(0);
    setProdPurchasePrice('');
    setProdBulkPrice('');
    setPurchasePriceMode('unit');
    setModalType('add_prod');
  };

  const handleAddProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;
    if (!prodName.trim() || prodPrice === '' || Number(prodPrice) <= 0) {
      onShowToast('Enter valid product name and retail price', true);
      return;
    }
    let calculatedBp = 0;
    if (purchasePriceMode === 'bulk' && prodBulkPrice !== '' && Number(prodBulkPrice) > 0) {
      const stockQty = Number(prodStock) || 1;
      calculatedBp = Number(prodBulkPrice) / stockQty;
    } else if (prodPurchasePrice !== '') {
      calculatedBp = Number(prodPurchasePrice);
    }
    onAddProduct(selectedBiz.id, prodName, Number(prodPrice), Number(prodStock || 0), calculatedBp);
    setModalType(null);
  };

  const openRestock = (prod: Product) => {
    setSelectedProd(prod);
    setRestockQty('');
    setRestockCost('');
    setModalType('restock');
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    if (restockQty === '' || Number(restockQty) <= 0 || restockCost === '' || Number(restockCost) < 0) {
      onShowToast('Enter valid stock quantities & procurement expense costs', true);
      return;
    }
    onRestockProduct(selectedProd.id, Number(restockQty), Number(restockCost));
    setModalType(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-slate-500" /> Shops & Stock
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Add or edit shops, manage items, set prices, and add stock.
          </p>
        </div>
        <button
          onClick={openAddBiz}
          className="px-3 py-2 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition rounded-xl cursor-pointer shadow-sm shrink-0"
        >
          + Add Shop
        </button>
      </div>

      {/* Operations Brs list layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {businesses.map((b) => {
          const bizProducts = products.filter((p) => p.bizId === b.id);
          const isActive = b.status === 'active';

          return (
            <div
              key={b.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-full overflow-hidden"
            >
              <div className="p-5 pb-3.5 border-b border-slate-50">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">{b.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {b.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded border ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : 'bg-rose-50 border-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                    <div className="flex items-center gap-2.5 mt-1 pt-1 border-t border-slate-100 w-full justify-end">
                      <button
                        onClick={() => openEditBiz(b)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </button>
                      <button
                        onClick={() => setBranchToDelete(b)}
                        className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products in this Branch */}
              <div className="p-5 bg-slate-50/20 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-400" /> Stock
                  </h4>
                  <button
                    onClick={() => openAddProd(b.id)}
                    className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Item
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 flex-1">
                  {bizProducts.map((p) => {
                    const isLowStock = p.stock < lowStockThreshold;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-3 group hover:bg-white/40 rounded-lg px-2 -mx-2 transition"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                isLowStock
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              Stock: {p.stock}
                            </span>
                            {isLowStock && (
                              <span className="inline-flex items-center text-[9px] text-rose-600 font-bold tracking-wide uppercase px-1.5 py-0.2 bg-rose-50 border border-rose-100 rounded">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5 shrink-0" /> Low Stock
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-extrabold text-slate-900 text-xs md:text-sm">
                            {formatCurrency(p.price)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openRestock(p)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="Add Stock"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {bizProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No products in this shop. Click + Add Item to start.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals Injected Dom */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setModalType(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10 border border-slate-100 animate-slide-up">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs tracking-tight uppercase tracking-wider">
                {modalType === 'add_biz' && 'Add Shop'}
                {modalType === 'edit_biz' && 'Edit Shop'}
                {modalType === 'add_prod' && `Add Item`}
                {modalType === 'restock' && `Add Stock`}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Add Biz Form */}
              {modalType === 'add_biz' && (
                <form onSubmit={handleAddBizSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Shop Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                      placeholder="e.g. Cosmetics Shop"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      required
                      value={bizLoc}
                      onChange={(e) => setBizLoc(e.target.value)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                      placeholder="e.g. CBD Nairobi"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md mt-2"
                  >
                    Save Shop
                  </button>
                </form>
              )}

              {/* Edit Biz Form */}
              {modalType === 'edit_biz' && (
                <form onSubmit={handleEditBizSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Shop Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      required
                      value={bizLoc}
                      onChange={(e) => setBizLoc(e.target.value)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Status
                    </label>
                    <select
                      value={bizStatus}
                      onChange={(e) => setBizStatus(e.target.value as any)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-medium font-sans appearance-none bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Locked</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md mt-2"
                  >
                    Save
                  </button>
                </form>
              )}

              {/* Add Product Form */}
              {modalType === 'add_prod' && (
                <form onSubmit={handleAddProdSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                      placeholder="e.g. Perfume 250ml"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Price (KSh)
                      </label>
                      <input
                        type="number"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Starting Stock
                      </label>
                      <input
                        type="number"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Purchase price option */}
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-500 uppercase tracking-wider font-sans">Purchase Price Entry Method</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPurchasePriceMode('unit')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition text-[9px] ${
                            purchasePriceMode === 'unit' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Per Unit (BP)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurchasePriceMode('bulk')}
                          className={`px-2 py-0.5 rounded font-bold cursor-pointer transition text-[9px] ${
                            purchasePriceMode === 'bulk' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Bulk Purchase
                        </button>
                      </div>
                    </div>

                    {purchasePriceMode === 'unit' ? (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          BP per Unit (Buying Price in KSh)
                        </label>
                        <input
                          type="number"
                          value={prodPurchasePrice}
                          onChange={(e) => setProdPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-slate-200 bg-white p-2 text-xs rounded-lg outline-none focus:border-slate-900 font-semibold"
                          placeholder="e.g. 600"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Total Bulk Purchase Cost (KSh)
                        </label>
                        <input
                          type="number"
                          value={prodBulkPrice}
                          onChange={(e) => setProdBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-slate-200 bg-white p-2 text-xs rounded-lg outline-none focus:border-slate-900 font-semibold"
                          placeholder="e.g. 30000"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">
                          BP per unit will be auto calculated: {
                            prodBulkPrice && prodStock ? `KSh ${(Number(prodBulkPrice) / Math.max(1, Number(prodStock))).toFixed(2)}` : '0.00'
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md mt-2"
                  >
                    Save Product
                  </button>
                </form>
              )}

              {/* Restock product logic */}
              {modalType === 'restock' && (
                <form onSubmit={handleRestockSubmit} className="space-y-4">
                  <div className="bg-blue-50/50 p-4 border border-blue-100/50 rounded-xl space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                      Expense Note
                    </p>
                    <p className="text-xs text-blue-900 leading-relaxed font-sans">
                      Adding stock registers as a shop expense on this app.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Stock Amount
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium text-center text-lg animate-fade-in"
                      placeholder="e.g. 50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Total Cost (KSh)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={restockCost}
                      onChange={(e) => setRestockCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium text-center text-lg animate-fade-in"
                      placeholder="e.g. 15000"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md mt-2"
                  >
                    Save Stock
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accidental Delete Protection - Branch Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setBranchToDelete(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10 border border-slate-100 animate-slide-up font-sans text-left">
            <div className="px-5 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
              <h3 className="font-extrabold text-rose-900 text-xs tracking-wider uppercase">
                Confirm Shop Removal
              </h3>
              <button
                onClick={() => setBranchToDelete(null)}
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Are you absolutely sure you want to permanently delete the shop <strong className="text-slate-900 font-extrabold">"{branchToDelete.name}"</strong>? This will permanently decommission and archive all transactions and settings specifically for this branch location.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBranchToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBranch(branchToDelete.id);
                    setBranchToDelete(null);
                  }}
                  className="flex-1 py-2 bg-rose-650 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Delete Protection - Product Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setProductToDelete(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10 border border-slate-100 animate-slide-up font-sans text-left">
            <div className="px-5 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
              <h3 className="font-extrabold text-rose-900 text-xs tracking-wider uppercase">
                Confirm Item Removal
              </h3>
              <button
                onClick={() => setProductToDelete(null)}
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Are you absolutely sure you want to delete <strong className="text-slate-900 font-extrabold">"{productToDelete.name}"</strong> from your catalog inventory? This will exclude the item from future cashier logs.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  }}
                  className="flex-1 py-2 bg-rose-650 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
