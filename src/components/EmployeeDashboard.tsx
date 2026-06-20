import React, { useState } from 'react';
import {
  ShoppingCart,
  PackagePlus,
  Receipt,
  Wallet,
  LogOut,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Lock,
  User,
  Activity,
  Award,
  Calendar,
  Edit3,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Business, Product, TeamMember, Transaction, CartItem, LogEditRequest } from '../types';

interface EmployeeDashboardProps {
  currentUser: TeamMember;
  businesses: Business[];
  products: Product[];
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onLogout: () => void;
  onShowToast: (msg: string, isError?: boolean) => void;
  onUpdateProfile: (updated: TeamMember) => boolean;
  onAddProduct?: (bizId: string, name: string, price: number, stock: number, purchasePrice?: number) => void;
  onCreateEditRequest?: (txId: string, proposed: { amount: number; category?: string; details?: string }) => void;
  editRequests?: LogEditRequest[];
}

type Mode = 'menu' | 'sale' | 'restock' | 'expense' | 'cash_count' | 'profile' | 'logs_calendar';

export default function EmployeeDashboard({
  currentUser,
  businesses,
  products,
  transactions,
  onAddTransaction,
  onLogout,
  onShowToast,
  onUpdateProfile,
  onAddProduct,
  onCreateEditRequest,
  editRequests,
}: EmployeeDashboardProps) {
  const [mode, setMode] = useState<Mode>('menu');

  // Active Branch derived
  const activeBranch = businesses.find((b) => b.id === currentUser?.bizId);
  const isBranchLocked = (currentUser?.status === 'suspended') || !activeBranch || (activeBranch.status === 'inactive');

  // --- Sub-modes States ---
  // 1. Record Sale State
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  
  // 2. Add Stock State
  const [selectedProdToRestock, setSelectedProdToRestock] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockCost, setRestockCost] = useState<number | ''>('');

  // 3. Log Expense State
  const [expenseAmt, setExpenseAmt] = useState<number | ''>('');
  const [expenseCat, setExpenseCat] = useState('Fuel');
  const [customExpenseCat, setCustomExpenseCat] = useState('');

  // 4. Drawer reconciliation State
  const [cashActual, setCashActual] = useState<number | ''>('');

  // 4b. Logs Calendar & Edit proposed states
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [proposedAmount, setProposedAmount] = useState<number | ''>('');
  const [proposedCategory, setProposedCategory] = useState<string>('');
  const [proposedDetails, setProposedDetails] = useState<string>('');

  // 5. Profile Edit State
  const [profileName, setProfileName] = useState(currentUser.name || '');
  const [profileUsername, setProfileUsername] = useState(currentUser.username || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profilePin, setProfilePin] = useState(currentUser.pin || '');

  // 6. Cashier product creation hooks
  const [employeeAddProdModal, setEmployeeAddProdModal] = useState(false);
  const [empProdName, setEmpProdName] = useState('');
  const [empProdPrice, setEmpProdPrice] = useState<number | ''>('');
  const [empProdStock, setEmpProdStock] = useState<number | ''>('');
  const [empProdPurchasePrice, setEmpProdPurchasePrice] = useState<number | ''>('');
  const [empPurchasePriceMode, setEmpPurchasePriceMode] = useState<'unit' | 'bulk'>('unit');
  const [empProdBulkPrice, setEmpProdBulkPrice] = useState<number | ''>('');

  // Keep profile edit state in sync with updated currentUser prop values
  React.useEffect(() => {
    setProfileName(currentUser.name || '');
    setProfileUsername(currentUser.username || '');
    setProfilePhone(currentUser.phone || '');
    setProfilePin(currentUser.pin || '');
  }, [currentUser]);

  const formatCurrency = (val: number) => {
    return 'KSh ' + (val || 0).toLocaleString('en-US');
  };

  const getBranchProducts = () => {
    return products.filter((p) => p.bizId === currentUser.bizId);
  };

  // Calculate drawer expected cash from transaction history
  const getExpectedDrawerCash = () => {
    if (!currentUser.bizId) return 0;
    
    // Sum everything since last drawer count
    let totalSales = 0;
    let totalExpenses = 0;

    // Filter branch transactions sorted by date
    const branchTxs = transactions
      .filter((t) => t.bizId === currentUser.bizId)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Find the latest cash_count
    const lastCountIdx = branchTxs.findIndex((t) => t.type === 'cash_count');
    const relevantTxs = lastCountIdx !== -1 ? branchTxs.slice(0, lastCountIdx) : branchTxs;

    relevantTxs.forEach((t) => {
      if (t.type === 'sale') totalSales += t.amount;
      if (t.type === 'expense') totalExpenses += t.amount;
    });

    return totalSales - totalExpenses;
  };

  // Recent activity logged globally by this cash register attendant today
  const getStaffRecentTxs = () => {
    return transactions
      .filter((t) => t.userId === currentUser.id && t.bizId === currentUser.bizId)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  };

  // Handlers for Sale Cart Operations
  const handleCartChange = (prodId: string, change: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const currentQty = cart[prodId] || 0;
    let nextQty = currentQty + change;
    if (nextQty < 0) nextQty = 0;
    if (nextQty > prod.stock) {
      onShowToast(`Only ${prod.stock} items left in stock`, true);
      nextQty = prod.stock;
    }

    setCart({
      ...cart,
      [prodId]: nextQty,
    });
  };

  const salesCartTotal = () => {
    let sum = 0;
    Object.keys(cart).forEach((id) => {
      const p = products.find((prod) => prod.id === id);
      if (p) {
        sum += (cart[id] || 0) * p.price;
      }
    });
    return sum;
  };

  const handleSaleSubmit = () => {
    const activeProducts = getBranchProducts();
    const cartItems: CartItem[] = [];
    let itemsCount = 0;
    let saleAmt = 0;

    Object.keys(cart).forEach((id) => {
      const qty = cart[id] || 0;
      if (qty > 0) {
        const prod = activeProducts.find((p) => p.id === id);
        if (prod) {
          cartItems.push({
            id: prod.id,
            name: prod.name,
            qty,
            price: prod.price,
          });
          itemsCount += qty;
          saleAmt += qty * prod.price;
        }
      }
    });

    if (saleAmt <= 0) {
      onShowToast("Select at least 1 item to sell", true);
      return;
    }

    onAddTransaction({
      type: 'sale',
      amount: saleAmt,
      bizId: currentUser.bizId,
      userId: currentUser.id,
      items: itemsCount,
      cart: cartItems,
    });

    onShowToast(`Sale saved: ${formatCurrency(saleAmt)}`);
    setCart({});
    setMode('menu');
  };

  // Add Stock Handler
  const handleRestockSubmit = () => {
    if (!selectedProdToRestock) return;
    if (restockQty === '' || Number(restockQty) <= 0 || restockCost === '' || Number(restockCost) < 0) {
      onShowToast('Enter stock amount and total cost', true);
      return;
    }

    onAddTransaction({
      type: 'expense',
      amount: Number(restockCost),
      bizId: currentUser.bizId,
      userId: currentUser.id,
      category: 'Stock',
      details: `Added ${restockQty}x ${selectedProdToRestock.name}`,
    });

    // Update local product stock directly on product list (handled in parent, we notify transaction)
    onShowToast(`Stock added: ${restockQty}x ${selectedProdToRestock.name}`);
    setMode('menu');
    setSelectedProdToRestock(null);
  };

  // Log Expense Handler
  const handleExpenseSubmit = () => {
    if (expenseAmt === '' || Number(expenseAmt) <= 0) {
      onShowToast('Enter spending amount', true);
      return;
    }

    const finalCategory = expenseCat === 'Other' ? (customExpenseCat.trim() || 'Other') : expenseCat;

    onAddTransaction({
      type: 'expense',
      amount: Number(expenseAmt),
      bizId: currentUser.bizId,
      userId: currentUser.id,
      category: finalCategory,
      details: `Recorded operational cost: ${finalCategory}`,
    });

    onShowToast(`Saved expense of ${formatCurrency(Number(expenseAmt))} under ${finalCategory}`);
    setMode('menu');
    setExpenseAmt('');
    setCustomExpenseCat('');
  };

  // Profile Edit Submit Handler
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = profileName.trim();
    const cleanUsername = profileUsername.trim().toLowerCase();
    const cleanPhone = profilePhone.trim();
    const cleanPin = profilePin.trim();

    if (!cleanName || !cleanUsername || !cleanPhone || !cleanPin) {
      onShowToast('Please fill out all required profile fields.', true);
      return;
    }

    if (cleanPin.length < 4) {
      onShowToast('Security PIN must be at least 4 digits.', true);
      return;
    }

    const updatedMember: TeamMember = {
      ...currentUser,
      name: cleanName,
      username: cleanUsername,
      phone: cleanPhone,
      pin: cleanPin,
    };

    const success = onUpdateProfile(updatedMember);
    if (success) {
      setMode('menu');
    }
  };

  const handleEmployeeAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.bizId) {
      onShowToast('No active business branch assigned', true);
      return;
    }
    if (!empProdName.trim() || empProdPrice === '' || Number(empProdPrice) <= 0) {
      onShowToast('Enter valid product name and retail price', true);
      return;
    }
    let calculatedBp = 0;
    if (empPurchasePriceMode === 'bulk' && empProdBulkPrice !== '' && Number(empProdBulkPrice) > 0) {
      const stockQty = Number(empProdStock) || 1;
      calculatedBp = Number(empProdBulkPrice) / stockQty;
    } else if (empProdPurchasePrice !== '') {
      calculatedBp = Number(empProdPurchasePrice);
    }

    if (onAddProduct) {
      onAddProduct(currentUser.bizId, empProdName, Number(empProdPrice), Number(empProdStock || 0), calculatedBp);
      onShowToast(`Stock item "${empProdName}" successfully created!`);
      // Reset
      setEmpProdName('');
      setEmpProdPrice('');
      setEmpProdStock('');
      setEmpProdPurchasePrice('');
      setEmpProdBulkPrice('');
      setEmployeeAddProdModal(false);
    } else {
      onShowToast('Product creation service not available', true);
    }
  };

  // Drawer Reconciliation Handler
  const handleReconcileSubmit = () => {
    if (cashActual === '' || Number(cashActual) < 0) {
      onShowToast('Enter cash amount in drawer', true);
      return;
    }

    const countedVal = Number(cashActual);
    const predictedVal = getExpectedDrawerCash();

    // Trigger reconciliation transaction to record expected reset
    onAddTransaction({
      type: 'cash_count',
      amount: countedVal,
      bizId: currentUser.bizId,
      userId: currentUser.id,
      details: `Physical register drawer audit completed.`,
    });

    onShowToast('Cash audit saved.', false);
    setMode('menu');
    setCashActual('');
  };

  // --- LOGS CALENDAR HELPERS ---
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (offset: number) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDateStr(null);
    setEditingTxId(null);
  };

  const handleEditRequestSubmit = (txId: string) => {
    if (proposedAmount === '' || Number(proposedAmount) < 0) {
      onShowToast('Please provide a valid proposed amount.', true);
      return;
    }
    if (!proposedDetails.trim()) {
      onShowToast('Please state the reason for this log adjustment request.', true);
      return;
    }

    if (onCreateEditRequest) {
      onCreateEditRequest(txId, {
        amount: Number(proposedAmount),
        category: proposedCategory || undefined,
        details: proposedDetails.trim(),
      });
    }

    // Reset editing state
    setEditingTxId(null);
    setProposedAmount('');
    setProposedCategory('');
    setProposedDetails('');
  };

  // --- RENDERING ROUTER ---

  // LOCKED SCENARIO
  if (isBranchLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-sm w-full text-center shadow-xl shadow-slate-900/5 space-y-5 animate-slide-up">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">Locked</h3>
            <p className="text-slate-550 text-xs leading-relaxed">
              Your shop or cashier account is locked. Please contact the administrator.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-slate-900 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl hover:bg-slate-850 cursor-pointer transition shadow-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header Profile Dashboard */}
      <div className="bg-white px-6 py-6 shadow-xs border-b border-slate-200/60 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 truncate leading-tight">
              {activeBranch.name}
            </h2>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1.5 font-bold uppercase tracking-wider">
              <User className="w-4 h-4 text-slate-400" /> {currentUser.name} <span className="text-slate-300">•</span>{' '}
              {currentUser.role}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.role !== 'owner' && (
              <button
                onClick={() => setMode(mode === 'profile' ? 'menu' : 'profile')}
                className={`p-2 rounded-xl transition border cursor-pointer shadow-xs ${
                  mode === 'profile'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 border-slate-200/50 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Edit Profile Settings"
              >
                <User className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200/50 cursor-pointer shadow-xs"
              title="Logout Session"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main interaction workspace */}
      <div className="px-4 py-6 flex-1 max-w-2xl mx-auto w-full space-y-6">
        {mode === 'menu' && (
          <>
            {/* Quick action grid buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode('sale')}
                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50/10 active:scale-98 transition group h-36"
              >
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition border border-emerald-100/50">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">
                  Sell
                </span>
              </button>

              <button
                onClick={() => setMode('restock')}
                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50/10 active:scale-98 transition group h-36"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition border border-blue-100/50">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">
                  Stock
                </span>
              </button>

              <button
                onClick={() => setMode('expense')}
                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-rose-300 hover:shadow-lg hover:shadow-rose-50/10 active:scale-98 transition group h-36"
              >
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition border border-rose-100/50">
                  <Receipt className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">
                  Expense
                </span>
              </button>

              <button
                onClick={() => setMode('cash_count')}
                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-400 hover:shadow-lg hover:shadow-slate-50/10 active:scale-98 transition group h-36"
              >
                <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition border border-slate-200/50">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">
                  Cash Audit
                </span>
              </button>

              <button
                id="btn-logs-calendar"
                onClick={() => setMode('logs_calendar')}
                className="col-span-2 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800 active:scale-98 transition shadow-xs h-20 px-6 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center border border-slate-700">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xs uppercase tracking-wider text-slate-100">
                      Logs Calendar & Edits
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      View past logs and request edit corrections
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            </div>

            {/* Quick Stats Summary for attendant reassurance */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex justify-between items-center relative overflow-hidden">
              <div className="space-y-1 z-10">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Expected Cash
                </p>
                <h3 className="text-xl font-black text-white">{formatCurrency(getExpectedDrawerCash())}</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 z-10">
                <Wallet className="text-white w-4 h-4" />
              </div>
            </div>

            {/* Local Attendant History logs */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Activity className="w-4 h-4 text-slate-450" /> Your Actions
              </h3>
              <div className="space-y-2">
                {getStaffRecentTxs().map((tx) => {
                  const isSale = tx.type === 'sale';
                  const isExpense = tx.type === 'expense';
                  return (
                     <div
                      key={tx.id}
                      className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex justify-between items-center hover:bg-slate-50/50 transition"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 capitalize">
                          {isSale ? 'Sale' : isExpense ? `Expense: ${tx.category}` : 'Audit'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 pb-0.5">
                          {new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-extrabold ${
                          isSale
                            ? 'text-emerald-600 animate-pulse'
                            : isExpense
                            ? 'text-rose-650'
                            : 'text-slate-800'
                        }`}
                      >
                        {isSale ? '+' : isExpense ? '-' : ''} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })}
                {getStaffRecentTxs().length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No transactions generated during this login shift.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* --- OPERATION VIEWPORTS --- */}

        {/* 1. SALES SHEETS WORKSPACE */}
        {mode === 'sale' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMode('menu')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                New Sale
              </span>
            </div>

            {/* Product selection grid cards */}
            <div className="space-y-3">
              {getBranchProducts().map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-slate-350 transition"
                  >
                    <div className="min-w-0 pr-3">
                      <h4 className="font-bold text-slate-950 text-sm md:text-base leading-tight truncate">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-extrabold text-blue-600">
                          {formatCurrency(p.price)}
                        </span>
                        <span className="text-slate-300 text-[10px] select-none">•</span>
                        <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                          Stock: {p.stock}
                        </span>
                      </div>
                    </div>

                    {/* Incremental Selector */}
                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button
                        onClick={() => handleCartChange(p.id, -1)}
                        className="w-8.5 h-8.5 bg-white text-slate-900 border border-slate-200 flex items-center justify-center text-md font-bold active:bg-slate-100 transition rounded-lg cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-extrabold text-slate-900 text-sm">{qty}</span>
                      <button
                        onClick={() => handleCartChange(p.id, 1)}
                        className="w-8.5 h-8.5 bg-white text-slate-900 border border-slate-200 flex items-center justify-center text-md font-bold active:bg-slate-100 transition rounded-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {getBranchProducts().length === 0 && (
                <p className="text-center text-slate-400 italic py-10">No products configured for this branch.</p>
              )}
            </div>

            {/* Fixed footer summary panel */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-lg space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Total
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-950">
                  {formatCurrency(salesCartTotal())}
                </span>
              </div>
              <button
                onClick={handleSaleSubmit}
                className="w-full bg-slate-950 hover:bg-slate-905 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition cursor-pointer text-center shadow-md"
              >
                Save Sale
              </button>
            </div>
          </div>
        )}

        {/* 2. REPLENISH CATALOG SELECTION */}
        {mode === 'restock' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setMode('menu');
                  setSelectedProdToRestock(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                Add Stock
              </span>
            </div>

            {/* List products step */}
            {!selectedProdToRestock ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 uppercase tracking-wide">Missing an item?</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Add a new stock item directly into catalog</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmployeeAddProdModal(true)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer shrink-0"
                  >
                    + Create Stock Item
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium">Choose product:</p>
                {getBranchProducts().map((p) => {
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProdToRestock(p)}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/5 transition shadow-xs"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm md:text-base leading-tight">{p.name}</h4>
                        <p className="text-[10px] text-slate-450 mt-1 uppercase font-bold tracking-wider">
                          Stock: {p.stock}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        Stock <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Stock input step
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <h4 className="font-bold text-slate-900 text-sm">Stock: {selectedProdToRestock.name}</h4>
                  <button
                    onClick={() => setSelectedProdToRestock(null)}
                    className="text-xs font-bold text-blue-600 cursor-pointer"
                  >
                    Change Item
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Stock amount
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full border border-slate-200 p-3 text-lg font-bold text-slate-900 text-center rounded-xl bg-slate-50 focus:bg-white focus:border-slate-350 outline-none"
                      placeholder="e.g. 50"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value === '' ? '' : Number(e.target.value))}
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
                      className="w-full border border-slate-200 p-3 text-lg font-bold text-slate-900 text-center rounded-xl bg-slate-50 focus:bg-white focus:border-slate-350 outline-none"
                      placeholder="e.g. 15000"
                      value={restockCost}
                      onChange={(e) => setRestockCost(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <button
                    onClick={handleRestockSubmit}
                    className="w-full bg-slate-950 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-md mt-2"
                  >
                    Save Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. LOG OPERATIONAL OUTFLOW EXPENSE */}
        {mode === 'expense' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMode('menu')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                Expense
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-center">
                  Amount spent
                </label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-base">
                    KSh
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    className="w-full border border-slate-200 text-slate-950 text-2xl font-black focus:border-slate-900 outline-none pl-14 p-3.5 rounded-xl shadow-xs text-center"
                    value={expenseAmt}
                    onChange={(e) => setExpenseAmt(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  {['Fuel', 'Transport', 'Utilities', 'Maintenance', 'Rent', 'Other'].map((c) => {
                    const isSelected = expenseCat === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setExpenseCat(c)}
                        className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider cursor-pointer shadow-xs transition ${
                          isSelected
                            ? 'bg-slate-950 border-slate-950 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>

                {expenseCat === 'Other' && (
                  <div className="mt-4 animate-slide-up">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Specify Custom Category Item
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-3 text-sm rounded-xl outline-none focus:border-slate-350 bg-slate-50 focus:bg-white font-medium"
                      placeholder="e.g. Stationery, Cleaning, Tea, etc."
                      value={customExpenseCat}
                      onChange={(e) => setCustomExpenseCat(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleExpenseSubmit}
                className="w-full bg-slate-950 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-md"
              >
                Save Expense
              </button>
            </div>
          </div>
        )}

        {/* 4. RECONCILE DRAWER PHYSICAL COUNT */}
        {mode === 'cash_count' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMode('menu')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                Cash Audit
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-6 text-center">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">Cash Audit</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans px-4">
                  Count the cash in your drawer and enter it below.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                   Cash in Drawer (KSh)
                </label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-base">
                    KSh
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    className="w-full border border-slate-200 text-slate-950 text-2xl font-black focus:border-slate-900 outline-none pl-15 p-3.5 rounded-xl shadow-xs text-center"
                    value={cashActual}
                    onChange={(e) => setCashActual(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Informative predicted message to guide the user */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-xs mx-auto text-left space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Expected Cash
                </span>
                <p className="text-xs text-slate-700 font-bold">
                  Expected Cash: {formatCurrency(getExpectedDrawerCash())}
                </p>
              </div>

              <button
                onClick={handleReconcileSubmit}
                className="w-full max-w-xs mx-auto block bg-slate-950 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-md"
              >
                Save Audit
              </button>
            </div>
          </div>
        )}

        {/* 5. EDIT PROFILE INFORMATION (USERNAME, PASSWORD / PIN, MOBILE NUMBER) */}
        {mode === 'profile' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMode('menu')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Menu
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                Edit Profile
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-base">Profile Settings</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Modify your name, username, registered phone number, and security login PIN.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition bg-slate-50 focus:bg-white"
                    placeholder="e.g. John Doe"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition bg-slate-50 focus:bg-white"
                    placeholder="e.g. johndoe"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition bg-slate-50 focus:bg-white"
                    placeholder="e.g. 0712345678"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Sign-in PIN code (Password)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-mono text-lg font-bold tracking-widest transition bg-slate-50 focus:bg-white"
                    placeholder="••••"
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your secure PIN code used to authorize register workstation sessions.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-slate-950 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 transition cursor-pointer shadow-md"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mode === 'logs_calendar' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden pb-4 space-y-6 animate-fade-in font-sans">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setMode('menu');
                  setSelectedDateStr(null);
                  setEditingTxId(null);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Menu
              </button>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Logs Calendar</h3>
              <div className="w-12 block" /> {/* spacer */}
            </div>

            {/* Calendar Controls */}
            <div className="px-5">
              <div className="bg-slate-50 rounded-xl border border-slate-150 p-3.5 flex items-center justify-between">
                <button
                  onClick={() => handleMonthChange(-1)}
                  className="p-1 px-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  {monthNames[currentMonth]} {currentYear}
                </h4>
                <button
                  onClick={() => handleMonthChange(1)}
                  className="p-1 px-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="px-5">
              <div className="grid grid-cols-7 gap-1.5 text-center mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
                  <span key={w} className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">
                    {w}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array(new Date(currentYear, currentMonth, 1).getDay()).fill(null).map((_, idx) => (
                  <div key={`blank-${idx}`} className="aspect-square bg-slate-50/20 border border-transparent" />
                ))}

                {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => i + 1).map((dayNum) => {
                  const cellDate = new Date(currentYear, currentMonth, dayNum);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPastDate = cellDate.getTime() < today.getTime();

                  const pad = (n: number) => String(n).padStart(2, '0');
                  const cellDateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;

                  const dayTxs = transactions.filter((t) => {
                    const txDateStr = t.time.split('T')[0];
                    return txDateStr === cellDateStr && t.bizId === currentUser.bizId;
                  });

                  const isSelected = selectedDateStr === cellDateStr;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      disabled={!isPastDate}
                      onClick={() => {
                        setSelectedDateStr(cellDateStr);
                        setEditingTxId(null);
                      }}
                      className={`aspect-square rounded-xl border flex flex-col justify-between p-1.5 transition ${
                        !isPastDate
                          ? 'bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                          : isSelected
                          ? 'bg-slate-950 border-slate-950 text-white shadow-md font-extrabold scale-102'
                          : 'bg-white border-slate-150 hover:bg-slate-50 cursor-pointer text-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">{dayNum}</span>
                      
                      {/* Badge or indicator */}
                      {isPastDate && dayTxs.length > 0 && (
                        <span className={`w-full text-center text-[8px] px-0.5 rounded-sm truncate ${
                          isSelected ? 'bg-white/20 text-white font-extrabold' : 'bg-amber-100 text-amber-800 font-extrabold'
                        }`}>
                          {dayTxs.length} tx
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Past Logs Panel */}
            {selectedDateStr && (
              <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/40">
                <div className="flex justify-between items-center bg-slate-100/50 border border-slate-200/50 rounded-xl p-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Past Date logs: {new Date(selectedDateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">Viewing register history for the current outlet branch.</p>
                  </div>
                  <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                    Read Only
                  </span>
                </div>

                {transactions.filter((t) => t.time.split('T')[0] === selectedDateStr && t.bizId === currentUser.bizId).length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 bg-white rounded-xl text-slate-405 font-bold text-xs">
                    No transaction entries found on this past date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions
                      .filter((t) => t.time.split('T')[0] === selectedDateStr && t.bizId === currentUser.bizId)
                      .map((tx) => {
                        const existingReq = editRequests?.find((r) => r.txId === tx.id);
                        const isEditing = editingTxId === tx.id;

                        return (
                          <div key={tx.id} id={`tx-card-${tx.id}`} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="capitalize font-black text-xs text-slate-900">{tx.type}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {tx.category && (
                                  <p className="text-[10px] text-slate-500 font-extrabold mt-0.5">{tx.category}</p>
                                )}
                                {tx.details && (
                                  <p className="text-[10px] text-slate-400 italic truncate mt-0.5">"{tx.details}"</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-xs text-slate-900 block">KSh {tx.amount.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Request / Action Overlay */}
                            {existingReq ? (
                              <div className="bg-slate-50 border border-slate-150 p-2 text-[10px] rounded flex justify-between items-center">
                                <div className="min-w-0 pr-2">
                                  <span className="font-extrabold text-slate-700 block">
                                    ✏️ Adjustment Request Submitted:
                                  </span>
                                  <span className="text-slate-500 mt-0.5 block font-bold truncate">
                                    Proposed Amount: KSh {existingReq.proposedData.amount.toLocaleString()} 
                                    {existingReq.proposedData.details && ` - "${existingReq.proposedData.details}"`}
                                  </span>
                                </div>
                                <span className={`shrink-0 font-extrabold uppercase px-1.5 py-0.5 rounded text-[8px] border ml-2 ${
                                  existingReq.status === 'pending'
                                    ? 'bg-amber-100 border-amber-200 text-amber-800'
                                    : existingReq.status === 'accepted'
                                    ? 'bg-emerald-100 border-emerald-200 text-emerald-800 animate-pulse'
                                    : 'bg-rose-100 border-rose-200 text-rose-800'
                                }`}>
                                  {existingReq.status}
                                </span>
                              </div>
                            ) : (
                              !isEditing && (
                                <button
                                  id={`btn-request-edit-${tx.id}`}
                                  onClick={() => {
                                    setEditingTxId(tx.id);
                                    setProposedAmount(tx.amount);
                                    setProposedCategory(tx.category || '');
                                    setProposedDetails('');
                                  }}
                                  className="w-full flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] py-1.5 rounded-lg transition font-extrabold cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Request Adjustments on past register
                                </button>
                              )
                            )}

                            {/* Inline Edit Form */}
                            {isEditing && (
                              <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl space-y-3 animate-fade-in text-[11px]">
                                <h5 className="font-extrabold text-amber-900 tracking-tight text-xs uppercase">
                                  Propose Adjustment Form
                                </h5>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-bold text-slate-600 mb-1">Proposed Amount (KSh)</label>
                                    <input
                                      type="number"
                                      value={proposedAmount}
                                      onChange={(e) => setProposedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="KSh"
                                      className="w-full border border-slate-200 rounded-lg p-2 font-bold outline-none bg-white text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-bold text-slate-600 mb-1">Proposed Category (if relevant)</label>
                                    <input
                                      type="text"
                                      value={proposedCategory}
                                      onChange={(e) => setProposedCategory(e.target.value)}
                                      placeholder="Category"
                                      className="w-full border border-slate-200 rounded-lg p-2 font-bold outline-none bg-white text-xs"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block font-bold text-slate-600 mb-1">Detailed Reason for adjustment memo (required)</label>
                                  <textarea
                                    value={proposedDetails}
                                    onChange={(e) => setProposedDetails(e.target.value)}
                                    placeholder="State corrected item details or specific transaction typo reason..."
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-lg p-2 font-medium outline-none bg-white text-xs resize-none"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingTxId(null)}
                                    className="flex-1 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    id={`btn-submit-${tx.id}`}
                                    onClick={() => handleEditRequestSubmit(tx.id)}
                                    className="flex-1 py-2 bg-slate-950 text-white hover:bg-slate-900 font-bold rounded-lg cursor-pointer transition shadow-xs"
                                  >
                                    Submit For Authorization
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Cashier stock creation modal */}
      {employeeAddProdModal && (
        <div className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xl w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h4 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
                Create New Stock Item
              </h4>
              <button
                type="button"
                onClick={() => setEmployeeAddProdModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmployeeAddProductSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1-5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={empProdName}
                  onChange={(e) => setEmpProdName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                  placeholder="e.g. Lavender Oil 10ml"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1-5">
                    Selling Price (KSh)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={empProdPrice}
                    onChange={(e) => setEmpProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                    placeholder="e.g. 1200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1-5">
                    Starting Stock
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={empProdStock}
                    onChange={(e) => setEmpProdStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              {/* Purchase entries */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-500 uppercase tracking-wider font-sans">Purchase Price Entry</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmpPurchasePriceMode('unit')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition text-[9px] ${
                        empPurchasePriceMode === 'unit' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Unit BP
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpPurchasePriceMode('bulk')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition text-[9px] ${
                        empPurchasePriceMode === 'bulk' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Bulk Purchase
                    </button>
                  </div>
                </div>

                {empPurchasePriceMode === 'unit' ? (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      BP per Unit (Buying Price in KSh)
                    </label>
                    <input
                      type="number"
                      value={empProdPurchasePrice}
                      onChange={(e) => setEmpProdPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-200 bg-white p-2 text-xs rounded-lg outline-none focus:border-slate-900 font-semibold"
                      placeholder="e.g. 700"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Total Bulk Purchase Cost (KSh)
                    </label>
                    <input
                      type="number"
                      value={empProdBulkPrice}
                      onChange={(e) => setEmpProdBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-200 bg-white p-2 text-xs rounded-lg outline-none focus:border-slate-900 font-semibold"
                      placeholder="e.g. 14000"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">
                      BP per unit will be auto calculated: {
                        empProdBulkPrice && empProdStock ? `KSh ${(Number(empProdBulkPrice) / Math.max(1, Number(empProdStock))).toFixed(2)}` : '0.00'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmployeeAddProdModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase cursor-pointer hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs uppercase cursor-pointer transition shadow-md"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
