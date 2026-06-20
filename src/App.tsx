import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Menu,
  BarChart2,
  Briefcase,
  Users,
  Activity,
  LayoutDashboard,
  Award,
  ChevronRight,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import {
  Business,
  Product,
  TeamMember,
  Transaction,
  AuditLog,
  OwnerTab,
  CurrentUser,
  CartItem,
  LogEditRequest
} from './types';

import {
  initDB,
  getBusinesses,
  saveBusinesses,
  getProducts,
  saveProducts,
  getTeam,
  saveTeam,
  getTransactions,
  saveTransactions,
  getLogs,
  saveLogs,
  logAction,
  subscribeToDBChanges,
  getEditRequests,
  saveEditRequests,
  deleteDocumentFromFirestore
} from './db';

import Sidebar from './components/Sidebar';
import OwnerDashboard from './components/OwnerDashboard';
import OwnerAnalytics from './components/OwnerAnalytics';
import OwnerBranches from './components/OwnerBranches';
import OwnerTeam from './components/OwnerTeam';
import OwnerLogs from './components/OwnerLogs';
import EmployeeDashboard from './components/EmployeeDashboard';
import { auth } from './firebase';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('tm_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Password reset workflow states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetStep, setResetStep] = useState<'phone' | 'otp'>('phone');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  // Dynamic system owner authorization credentials
  const [ownerUsername, setOwnerUsername] = useState(() => localStorage.getItem('tm_owner_username') || 'admin');
  const [ownerGoogleEmail, setOwnerGoogleEmail] = useState(() => localStorage.getItem('tm_owner_google_email') || 'micahprincemicah001@gmail.com');
  const [ownerPhone, setOwnerPhone] = useState(() => localStorage.getItem('tm_owner_phone') || '0712345678');
  const [ownerPin, setOwnerPin] = useState(() => localStorage.getItem('tm_owner_pin') || '4321');

  // Active Tab for Admin/Owner dashboard
  const [ownerTab, setOwnerTab] = useState<OwnerTab>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Core collections synced from Storage
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try { return getBusinesses(); } catch { return []; }
  });
  const [products, setProducts] = useState<Product[]>(() => {
    try { return getProducts(); } catch { return []; }
  });
  const [team, setTeam] = useState<TeamMember[]>(() => {
    try { return getTeam(); } catch { return []; }
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try { return getTransactions(); } catch { return []; }
  });
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try { return getLogs(); } catch { return []; }
  });
  const [editRequests, setEditRequests] = useState<LogEditRequest[]>(() => {
    try { return getEditRequests(); } catch { return []; }
  });

  // Toast status
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  // Customizable global client parameters
  const [enterpriseName, setEnterpriseName] = useState(() => localStorage.getItem('tm_setting_enterprise_name') || 'TrippleM');
  const [currencySymbol, setCurrencySymbol] = useState(() => 'KSh');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => Number(localStorage.getItem('tm_setting_low_stock_threshold') || '15'));

  const checkDuplicateCredentials = (
    excludeId: string | undefined,
    phone: string,
    username?: string,
    googleEmail?: string
  ): { hasDuplicate: boolean; message: string } => {
    const raw = getTeam();
    const phoneClean = phone.trim();
    const usernameClean = username?.trim().toLowerCase();
    const emailClean = googleEmail?.trim().toLowerCase();

    for (const member of raw) {
      if (excludeId && member.id === excludeId) continue;

      // Check phone duplication
      if (phoneClean && member.phone && member.phone.trim() === phoneClean) {
        return {
          hasDuplicate: true,
          message: `The phone number "${phoneClean}" is already registered to ${member.id === 'admin' || member.role === 'owner' ? 'the Owner' : member.name}.`,
        };
      }

      // Check username duplication
      if (usernameClean && member.username && member.username.trim().toLowerCase() === usernameClean) {
        return {
          hasDuplicate: true,
          message: `The username "${username}" is already taken by ${member.id === 'admin' || member.role === 'owner' ? 'the Owner' : member.name}.`,
        };
      }

      // Check email duplication
      if (emailClean && member.googleEmail && member.googleEmail.trim().toLowerCase() === emailClean) {
        return {
          hasDuplicate: true,
          message: `The Google Email "${googleEmail}" is already registered to ${member.id === 'admin' || member.role === 'owner' ? 'the Owner' : member.name}.`,
        };
      }

      // Cross duplication check to ensure emails/usernames/phones don't look like each other
      if (usernameClean && member.googleEmail && member.googleEmail.trim().toLowerCase() === usernameClean) {
        return {
          hasDuplicate: true,
          message: `The username "${username}" conflicts with another user's registered Google Email.`,
        };
      }
      if (emailClean && member.username && member.username.trim().toLowerCase() === emailClean) {
        return {
          hasDuplicate: true,
          message: `The Google Email "${googleEmail}" conflicts with another user's registered username.`,
        };
      }
    }
    return { hasDuplicate: false, message: '' };
  };

  const handleSaveSettings = (
    name: string, 
    lowStock: number, 
    phone?: string, 
    pin?: string, 
    username?: string, 
    googleEmail?: string
  ) => {
    // Exclude owner document from conflict checks so they don't block themselves
    const adminDoc = team.find(t => t.id === 'admin' || t.role === 'owner' || (currentUser && t.id === currentUser.id));
    const adminId = adminDoc?.id || 'admin';

    if (phone || username || googleEmail) {
      const dup = checkDuplicateCredentials(adminId, phone || '', username, googleEmail);
      if (dup.hasDuplicate) {
        showToastMsg(`Failed to save settings: ${dup.message}`, true);
        return;
      }
    }

    setEnterpriseName(name);
    setLowStockThreshold(lowStock);
    localStorage.setItem('tm_setting_enterprise_name', name);
    localStorage.setItem('tm_setting_currency_symbol', 'KSh');
    localStorage.setItem('tm_setting_low_stock_threshold', String(lowStock));

    if (phone) {
      setOwnerPhone(phone);
      localStorage.setItem('tm_owner_phone', phone);
    }
    if (pin) {
      setOwnerPin(pin);
      localStorage.setItem('tm_owner_pin', pin);
    }
    if (username) {
      setOwnerUsername(username);
      localStorage.setItem('tm_owner_username', username);
    }
    if (googleEmail) {
      setOwnerGoogleEmail(googleEmail.toLowerCase());
      localStorage.setItem('tm_owner_google_email', googleEmail.toLowerCase());
    }

    // Now update the admin document inside Firestore team collection as well!
    const nextTeam = team.map(member => {
      if (member.id === 'admin' || member.role === 'owner' || (currentUser && member.id === currentUser.id)) {
        return {
          ...member,
          phone: phone || member.phone,
          pin: pin || member.pin,
          username: username || member.username,
          googleEmail: googleEmail?.toLowerCase() || member.googleEmail,
        };
      }
      return member;
    });

    const adminExists = team.some(member => member.id === 'admin' || member.role === 'owner' || (currentUser && member.id === currentUser.id));
    if (!adminExists) {
      const adminMock: TeamMember = {
        id: adminId,
        name: 'Admin',
        role: 'owner',
        bizId: '',
        status: 'active',
        phone: phone || ownerPhone,
        pin: pin || ownerPin,
        username: username || ownerUsername,
        googleEmail: googleEmail?.toLowerCase() || ownerGoogleEmail,
      };
      nextTeam.unshift(adminMock);
    }

    saveTeam(nextTeam);
    setTeam(nextTeam);

    logAction('Settings Configured', `Enterprise defaults customized: Name: "${name}", Low Stock: ${lowStock}. Admin credentials aligned.`);
    showToastMsg('Preferences and login profile saved successfully.');
  };

  // Sync state with Storage on startup and listen for real-time Firestore updates
  useEffect(() => {
    initDB();
    refreshAllState();

    const unsubscribe = subscribeToDBChanges(() => {
      refreshAllState();
    });

    return unsubscribe;
  }, []);

  // Synchronize dynamic owner credentials states when team list changes
  useEffect(() => {
    const adminDoc = team.find(t => t.id === 'admin' || t.role === 'owner');
    if (adminDoc) {
      let changed = false;
      if (adminDoc.username && adminDoc.username !== ownerUsername) {
        setOwnerUsername(adminDoc.username);
        localStorage.setItem('tm_owner_username', adminDoc.username);
        changed = true;
      }
      if (adminDoc.googleEmail && adminDoc.googleEmail.toLowerCase() !== ownerGoogleEmail.toLowerCase()) {
        setOwnerGoogleEmail(adminDoc.googleEmail.toLowerCase());
        localStorage.setItem('tm_owner_google_email', adminDoc.googleEmail.toLowerCase());
        changed = true;
      }
      if (adminDoc.phone && adminDoc.phone !== ownerPhone) {
        setOwnerPhone(adminDoc.phone);
        localStorage.setItem('tm_owner_phone', adminDoc.phone);
        changed = true;
      }
      if (adminDoc.pin && adminDoc.pin !== ownerPin) {
        setOwnerPin(adminDoc.pin);
        localStorage.setItem('tm_owner_pin', adminDoc.pin);
        changed = true;
      }
      if (changed) {
        refreshAllState();
      }
    } else {
      // If no admin document found *ever* (e.g. database just loaded empty or initialized),
      // we can automatically write/seed the admin document using credentials available in local storage
      const currentOwnerPhone = localStorage.getItem('tm_owner_phone') || ownerPhone || '0712345678';
      const currentOwnerPin = localStorage.getItem('tm_owner_pin') || ownerPin || '4321';
      const currentOwnerGoogle = localStorage.getItem('tm_owner_google_email') || ownerGoogleEmail || 'micahprincemicah001@gmail.com';
      const currentOwnerUsername = localStorage.getItem('tm_owner_username') || ownerUsername || 'admin';

      const adminMock: TeamMember = {
        id: 'admin',
        name: 'Admin',
        role: 'owner',
        bizId: '',
        status: 'active',
        phone: currentOwnerPhone,
        pin: currentOwnerPin,
        googleEmail: currentOwnerGoogle,
        username: currentOwnerUsername,
      };
      
      const nextTeam = [adminMock, ...team];
      saveTeam(nextTeam);
      setTeam(nextTeam);
    }
  }, [team]);

  const refreshAllState = () => {
    setBusinesses(getBusinesses());
    setProducts(getProducts());
    setTeam(getTeam());
    setTransactions(getTransactions());
    setLogs(getLogs());
    setEditRequests(getEditRequests());
  };

  const showToastMsg = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --- MUTATIVE WRITERS (PERSIST TO STORAGE & REFRESH STATE) ---

  const handleGoogleSignIn = async () => {
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth, db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user && result.user.email) {
        const email = result.user.email.toLowerCase();
        const uid = result.user.uid;
        
        // 1. Fetch from Firestore /users/{uid}
        const userDocRef = doc(db, 'users', uid);
        let userDocSnap = null;
        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (e) {
          console.warn("Could not retrieve users collection document:", e);
        }

        const allStaff = getTeam();

        // Check if UID is a recognized admin or found in /users
        if (userDocSnap && userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const isAdmin = userData.admin === true || userData.role === 'owner' || userData.role === 'admin';

          if (isAdmin) {
            // Login as Admin
            const hqAdmin: CurrentUser = {
              role: 'owner',
              id: uid,
              name: userData.name || 'Admin',
            };
            setCurrentUser(hqAdmin);
            localStorage.setItem('tm_active_session', JSON.stringify(hqAdmin));
            setOwnerTab('dashboard');
            logAction('Executive Console Loaded', `Google login success (Admin via users record): ${email}`);
            showToastMsg('Welcome, Administrative Controller!');
            return;
          } else {
            // Regular user found in /users record
            // Check matching team member in local list or construct one
            let tm = allStaff.find(t => t.id === uid || (t.googleEmail && t.googleEmail.toLowerCase() === email));
            if (!tm) {
              tm = {
                id: uid,
                name: userData.name || 'Employee',
                role: userData.role || 'employee',
                bizId: userData.bizId || '',
                status: userData.status || 'active',
                phone: userData.phone || '',
                googleEmail: email,
                username: userData.username || '',
              };
              const updatedTeam = [...allStaff, tm];
              saveTeam(updatedTeam);
              setTeam(updatedTeam);
            }

            if (tm.status === 'suspended') {
              showToastMsg('Access Denied: This clerk account is locked or suspended.', true);
              logAction('Blocked Login Attempt', `Suspended clerk ${tm.name} attempted Google login.`, true, tm.bizId);
              return;
            }

            const sessionUser: CurrentUser = {
              role: 'employee',
              id: tm.id,
              name: tm.name,
              roleTitle: tm.role,
              bizId: tm.bizId,
              status: tm.status,
            };
            setCurrentUser(sessionUser);
            localStorage.setItem('tm_active_session', JSON.stringify(sessionUser));
            logAction('Register Terminal Login', `${tm.name} authorized via Google.`, false, tm.bizId);
            showToastMsg(`Welcome back, ${tm.name}`);
            return;
          }
        } else {
          // Check if Google login UID is not in /users but has a match in /teams (by email) Or Owner's default email
          let tm = allStaff.find(t => t.googleEmail && t.googleEmail.toLowerCase() === email);

          if (tm) {
            // Link UID to the existing team member and login as employee
            const oldId = tm.id;
            tm.id = uid;
            tm.googleEmail = email;

            const updatedTeam = allStaff.map(t => {
              if (t.id === oldId) {
                return tm!;
              }
              return t;
            });

            saveTeam(updatedTeam);
            setTeam(updatedTeam);

            if (oldId !== uid && oldId !== 'admin') {
              deleteDocumentFromFirestore('team', oldId);
            }

            if (tm.status === 'suspended') {
              showToastMsg('Access Denied: This clerk account is locked or suspended.', true);
              logAction('Blocked Login Attempt', `Suspended clerk ${tm.name} attempted Google login.`, true, tm.bizId);
              return;
            }

            const sessionUser: CurrentUser = {
              role: 'employee',
              id: tm.id,
              name: tm.name,
              roleTitle: tm.role,
              bizId: tm.bizId,
              status: tm.status,
            };
            setCurrentUser(sessionUser);
            localStorage.setItem('tm_active_session', JSON.stringify(sessionUser));
            logAction('Register Terminal Login', `${tm.name} auto-linked and logged in via Google.`, false, tm.bizId);
            showToastMsg(`Welcome back, ${tm.name}`);
            return;
          } else {
            // Check fallback for default administrative setup
            const savedOwnerGoogle = localStorage.getItem('tm_owner_google_email') || ownerGoogleEmail;
            if (email === savedOwnerGoogle.toLowerCase()) {
              const currentOwnerPhone = localStorage.getItem('tm_owner_phone') || ownerPhone;
              const currentOwnerPin = localStorage.getItem('tm_owner_pin') || ownerPin;
              const currentOwnerUsername = localStorage.getItem('tm_owner_username') || ownerUsername;

              const adminMock: TeamMember = {
                id: uid,
                name: 'Admin',
                role: 'owner',
                bizId: '',
                status: 'active',
                phone: currentOwnerPhone,
                pin: currentOwnerPin,
                googleEmail: email,
                username: currentOwnerUsername,
              };

              const nextTeam = [adminMock, ...allStaff.filter(t => t.id !== 'admin' && t.id !== uid && t.role !== 'owner')];
              saveTeam(nextTeam);
              setTeam(nextTeam);

              const hqAdmin: CurrentUser = {
                role: 'owner',
                id: uid,
                name: 'Admin',
              };
              setCurrentUser(hqAdmin);
              localStorage.setItem('tm_active_session', JSON.stringify(hqAdmin));
              setOwnerTab('dashboard');
              logAction('Executive Console Loaded', `Google login success: ${email} (Administrative setup generated)`);
              showToastMsg('Welcome, Administrative Controller!');
              return;
            }
          }
        }

        showToastMsg(`Access Denied: Google email ${email} is not registered in the system.`, true);
      }
    } catch (error: any) {
      console.warn('Google Sign-In popup setup:', error);
      showToastMsg(`Google Sign-In failed: ${error.message || 'Unknown error'}`, true);
    }
  };

  const handlePhoneLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryClean = loginPhone.trim();
    const pinClean = loginPin.trim();

    if (!entryClean || !pinClean) {
      showToastMsg('Please enter both your account identifier and Log-In PIN.', true);
      return;
    }

    const allStaff = getTeam();
    const tm = allStaff.find(t => 
      (t.phone && t.phone === entryClean) || 
      (t.username && t.username.toLowerCase() === entryClean.toLowerCase()) ||
      (t.googleEmail && t.googleEmail.toLowerCase() === entryClean.toLowerCase()) ||
      t.name.toLowerCase() === entryClean.toLowerCase()
    );
    
    if (tm) {
      if (tm.pin !== pinClean) {
        showToastMsg('Authorization Failed: Invalid security PIN code.', true);
        return;
      }

      if (tm.status === 'suspended') {
        showToastMsg('Access Denied: This clerk account is locked or suspended.', true);
        logAction('Blocked Login Attempt', `Suspended clerk ${tm.name} attempted login.`, true, tm.bizId);
        return;
      }

      // Link Google Email from active Firebase auth if empty simultaneously!
      if (auth.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.email) {
        const activeGmail = auth.currentUser.email.toLowerCase();
        if (!tm.googleEmail || tm.googleEmail.toLowerCase() !== activeGmail) {
          tm.googleEmail = activeGmail;
          const updatedTeam = allStaff.map(t => t.id === tm.id ? tm! : t);
          saveTeam(updatedTeam);
          setTeam(updatedTeam);
          logAction('Google Auth Linked', `Linked active Google credential ${activeGmail} to ${tm.name}.`);
          showToastMsg(`Simultaneously linked Google Email (${activeGmail}) to your profile!`);
        }
      }

      if (tm.role === 'owner' || tm.id === 'admin') {
        const hqAdmin: CurrentUser = {
          role: 'owner',
          id: 'admin',
          name: tm.name || 'Admin',
        };
        setCurrentUser(hqAdmin);
        localStorage.setItem('tm_active_session', JSON.stringify(hqAdmin));
        setOwnerTab('dashboard');
        logAction('Executive Console Loaded', 'Consolidated financial reports authenticated and parsed by owner.');
        showToastMsg('Welcome, Administrative Controller!');
        setLoginPhone('');
        setLoginPin('');
        return;
      } else {
        const sessionUser: CurrentUser = {
          role: 'employee',
          id: tm.id,
          name: tm.name,
          roleTitle: tm.role,
          bizId: tm.bizId,
          status: tm.status,
        };

        setCurrentUser(sessionUser);
        localStorage.setItem('tm_active_session', JSON.stringify(sessionUser));
        logAction('Register Terminal Login', `${tm.name} (${tm.role}) authorized session under branch register.`, false, tm.bizId);
        showToastMsg(`Welcome back, ${tm.name}`);
        setLoginPhone('');
        setLoginPin('');
        return;
      }
    }

    showToastMsg('Authorization Failed: No matching account found with that identifier and PIN.', true);
  };

  // --- Forgotten Password / Challenge-Response Reset Handlers ---
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = resetPhone.trim();
    if (!cleanInput) {
      showToastMsg('Please enter your Username, Email, or Employee Name to verify.', true);
      return;
    }

    // Check matches
    const isOwnerMatch = cleanInput.toLowerCase() === ownerUsername.toLowerCase() || 
                         (ownerGoogleEmail && cleanInput.toLowerCase() === ownerGoogleEmail.toLowerCase()) || 
                         cleanInput === ownerPhone;

    const matchedTeammate = team.find(t => 
      (t.username && t.username.toLowerCase() === cleanInput.toLowerCase()) ||
      (t.googleEmail && t.googleEmail.toLowerCase() === cleanInput.toLowerCase()) ||
      t.name.toLowerCase() === cleanInput.toLowerCase() ||
      (t.phone && t.phone === cleanInput)
    );

    if (!isOwnerMatch && !matchedTeammate) {
      showToastMsg('Security Error: No registered account is associated with this Username, Email, or Name.', true);
      return;
    }

    setResetStep('otp');
    logAction('Recovery Challenge Initiated', `Account found for ${cleanInput}. Security validation prompt dispatched.`);
    showToastMsg('Account found! Please confirm your registered mobile phone number to change your password.');
  };

  const handleConfirmResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanChallenge = enteredOtp.trim(); // enteredOtp represents "Phone confirmation challenge"
    const cleanNewPin = newPin.trim();

    if (!cleanChallenge || !cleanNewPin) {
      showToastMsg('Please enter both your registered Phone number and your new password.', true);
      return;
    }

    if (cleanNewPin.length < 4) {
      showToastMsg('Security requirement not met: Password must be at least 4 characters.', true);
      return;
    }

    const cleanInput = resetPhone.trim();
    const isOwnerMatch = cleanInput.toLowerCase() === ownerUsername.toLowerCase() || 
                         (ownerGoogleEmail && cleanInput.toLowerCase() === ownerGoogleEmail.toLowerCase()) || 
                         cleanInput === ownerPhone;

    const matchedTeammate = team.find(t => 
      (t.username && t.username.toLowerCase() === cleanInput.toLowerCase()) ||
      (t.googleEmail && t.googleEmail.toLowerCase() === cleanInput.toLowerCase()) ||
      t.name.toLowerCase() === cleanInput.toLowerCase() ||
      (t.phone && t.phone === cleanInput)
    );

    let isVerified = false;

    if (isOwnerMatch) {
      if (cleanChallenge === ownerPhone) {
        isVerified = true;
      }
    } else if (matchedTeammate) {
      if (matchedTeammate.phone && cleanChallenge === matchedTeammate.phone) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      showToastMsg('Security Error: The confirmation phone number entered does not match our records for this account.', true);
      return;
    }

    // Apply the password update
    if (isOwnerMatch) {
      setOwnerPin(cleanNewPin);
      localStorage.setItem('tm_owner_pin', cleanNewPin);
      
      const updatedCrew = team.map(member => {
        if (member.id === 'admin' || member.role === 'owner') {
          return { ...member, pin: cleanNewPin };
        }
        return member;
      });
      saveTeam(updatedCrew);
      setTeam(updatedCrew);
      
      logAction('Administrative Password Recovery', 'Administrative master security sign-in key reconfigured under identity challenge.');
    } else if (matchedTeammate) {
      const updatedCrew = team.map(member => {
        if (member.id === matchedTeammate.id) {
          return { ...member, pin: cleanNewPin };
        }
        return member;
      });

      saveTeam(updatedCrew);
      setTeam(updatedCrew);
      logAction('Staff Register Reset', `Crew attendant ${matchedTeammate.name} password reset successfully.`, false, matchedTeammate.bizId || null);
    }

    showToastMsg('Success! Your password has been updated.');
    
    // Clear recovery states and route back
    setIsForgotMode(false);
    setResetPhone('');
    setResetStep('phone');
    setEnteredOtp('');
    setNewPin('');

    // Prepopulate credentials for instant sign-in convenience
    setLoginPhone(cleanInput);
    setLoginPin('');
  };

  const handleLogout = () => {
    if (currentUser) {
      logAction(
        currentUser.role === 'owner' ? 'HQ Session Closed' : 'Terminal Register Closed',
        `${currentUser.name} logged out from standard console session.`,
        false,
        currentUser.bizId
      );
    }
    setCurrentUser(null);
    localStorage.removeItem('tm_active_session');
  };

  // 1. Transactions Manager (sale, restock, expense, reconciled checks)
  const handleAddTransaction = (newTx: Partial<Transaction>) => {
    const rawTxs = getTransactions();
    const updatedProducts = [...getProducts()];

    const finalTx: Transaction = {
      id: 't_' + Math.random().toString(36).substring(2, 11),
      type: newTx.type!,
      amount: newTx.amount!,
      bizId: newTx.bizId!,
      userId: newTx.userId!,
      time: new Date().toISOString(),
      items: newTx.items,
      cart: newTx.cart,
      category: newTx.category,
      details: newTx.details,
    };

    // Mutation side-effect checks
    if (finalTx.type === 'sale' && finalTx.cart) {
      // Decrement stock levels for sold items
      finalTx.cart.forEach((item: CartItem) => {
        const prod = updatedProducts.find((p) => p.id === item.id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.qty);
        }
      });
      saveProducts(updatedProducts);
    }

    rawTxs.push(finalTx);
    saveTransactions(rawTxs);

    // Dynamic Audit Logger triggers
    const activeBizName = getBusinesses().find((b) => b.id === finalTx.bizId)?.name || 'HQ Branch';
    if (finalTx.type === 'sale') {
      const summaryItems = finalTx.cart?.map((c) => `${c.qty}x ${c.name}`).join(', ') || '';
      logAction(
        'Sale Transacted',
        `Processed sale invoice worth KSh ${finalTx.amount.toLocaleString()}. Summary: ${summaryItems}. Handler: ${currentUser?.name}.`,
         false,
         finalTx.bizId
      );
    } else if (finalTx.type === 'expense') {
      const isReplenish = finalTx.category === 'Stock';
      if (isReplenish) {
        logAction(
          'Inventory Restocked',
          `Procured inventory items for KSh ${finalTx.amount.toLocaleString()}. Reference: ${finalTx.details}. Processed under ${activeBizName}.`,
          false,
          finalTx.bizId
        );
      } else {
        logAction(
          'Expense Logged',
          `Disbursed cash worth KSh ${finalTx.amount.toLocaleString()} for operational ${finalTx.category}. Processed under ${activeBizName}.`,
          finalTx.amount >= 15000, // Warn about massive payouts
          finalTx.bizId
        );
      }
    } else if (finalTx.type === 'cash_count') {
      // Calculate variance
      let expectedCash = 0;
      const branchTxs = rawTxs
        .filter((t) => t.bizId === finalTx.bizId)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Get everything since *previous* cash_count (excluding the current one)
      const prevCounts = branchTxs.filter((t) => t.type === 'cash_count' && t.id !== finalTx.id);
      const cutoffTime = prevCounts.length > 0 ? new Date(prevCounts[0].time).getTime() : 0;

      branchTxs.forEach((t) => {
        if (new Date(t.time).getTime() > cutoffTime && t.id !== finalTx.id) {
          if (t.type === 'sale') expectedCash += t.amount;
          if (t.type === 'expense') expectedCash -= t.amount;
        }
      });

      const actualCash = finalTx.amount;
      const variance = actualCash - expectedCash;

      if (variance !== 0) {
        logAction(
          'Reconciliation Discrepancy',
          `Critical cash register variance at ${activeBizName}! Predicted KSh ${expectedCash.toLocaleString()}; Counted KSh ${actualCash.toLocaleString()}. Disparity: ${variance > 0 ? '+' : ''}KSh ${variance.toLocaleString()}. Handler: ${currentUser?.name}.`,
          true,
          finalTx.bizId
        );
      } else {
        logAction(
          'Register Balanced',
          `Till checkout balanced perfectly at KSh ${actualCash.toLocaleString()} for ${activeBizName}. Reconciliation executed by ${currentUser?.name}.`,
          false,
          finalTx.bizId
        );
      }
    }

    refreshAllState();
  };

  // Self-service employee profile update handler
  const handleUpdateEmployeeProfile = (updatedMember: TeamMember) => {
    // Validate credentials uniqueness across all fields
    const dup = checkDuplicateCredentials(updatedMember.id, updatedMember.phone || '', updatedMember.username, updatedMember.googleEmail);
    if (dup.hasDuplicate) {
      showToastMsg(`Failed to save profile: ${dup.message}`, true);
      return false;
    }

    // 3. Update team list in memory and database
    const updatedTeam = team.map((member) => {
      if (member.id === updatedMember.id) {
        return updatedMember;
      }
      return member;
    });

    saveTeam(updatedTeam);
    setTeam(updatedTeam);

    // 4. Update current active user session
    if (currentUser?.id === updatedMember.id) {
      const nextSession: CurrentUser = {
        ...currentUser,
        name: updatedMember.name,
      };
      setCurrentUser(nextSession);
      localStorage.setItem('tm_active_session', JSON.stringify(nextSession));
    }

    logAction(
      'Profile Self-Updated',
      `Employee ${updatedMember.name} successfully updated their username, phone, or PIN.`,
      false,
      updatedMember.bizId
    );
    showToastMsg('Profile changes saved successfully!');
    return true;
  };

  // 2. Branch setups
  const handleAddBranch = (name: string, location: string) => {
    const raw = getBusinesses();
    const newBiz: Business = {
      id: 'b_' + Math.random().toString(36).substring(2, 11),
      name,
      location,
      status: 'active',
    };
    raw.push(newBiz);
    saveBusinesses(raw);
    logAction('Branch Established', `Constructed and authorized operations under ${name} in ${location}.`);
    showToastMsg(`Branch ${name} established.`);
    refreshAllState();
  };

  const handleEditBranch = (id: string, name: string, location: string, status: 'active' | 'inactive') => {
    const raw = getBusinesses();
    const biz = raw.find((b) => b.id === id);
    if (biz) {
      const oldState = biz.status;
      biz.name = name;
      biz.location = location;
      biz.status = status;
      saveBusinesses(raw);

      logAction(
        'Branch Settings Updated',
        `Branch configurations updated: ${name}. Regional deployment: ${location}. Operational status state: ${status}.`
      );

      // Warning alert if branch suspended
      if (oldState === 'active' && status === 'inactive') {
        logAction(
          'Operational Lockout Enforced',
          `Immediate operational suspension triggered for ${name}. ATTENTION: All linked registers and cashier duty handles are restricted.`,
          true,
          id
        );
      }

      showToastMsg(`Branch configurations updated`);
      refreshAllState();
    }
  };

  const handleDeleteBranch = (id: string) => {
    const raw = getBusinesses();
    const biz = raw.find((b) => b.id === id);
    if (biz) {
      const filteredBiz = raw.filter((b) => b.id !== id);
      saveBusinesses(filteredBiz);
      
      const filteredProds = getProducts().filter((p) => p.bizId !== id);
      saveProducts(filteredProds);

      // Explicitly delete from Firestore
      deleteDocumentFromFirestore('businesses', id);
      const prodsToDelete = getProducts().filter((p) => p.bizId === id);
      prodsToDelete.forEach((p) => {
        deleteDocumentFromFirestore('products', p.id);
      });

      logAction('Branch Decommissioned', `Permanently deleted and archived shop: ${biz.name} from company portfolio.`);
      showToastMsg(`Shop "${biz.name}" removed.`);
      refreshAllState();
    }
  };

  // 3. Product Catalog
  const handleAddProduct = (bizId: string, name: string, price: number, stock: number, purchasePrice?: number) => {
    const raw = getProducts();
    const newProd: Product = {
      id: 'p_' + Math.random().toString(36).substring(2, 11),
      bizId,
      name,
      price,
      stock,
      purchasePrice: purchasePrice || 0,
    };
    raw.push(newProd);
    saveProducts(raw);
    const bizName = getBusinesses().find((b) => b.id === bizId)?.name || 'Branch';
    logAction('Product Catalog Seeded', `Added item ${name} with selling price KSh ${price.toLocaleString()} and buying price per unit KSh ${(purchasePrice || 0).toLocaleString()} into ${bizName} inventory list.`);
    showToastMsg(`Product added to catalog.`);
    refreshAllState();
  };

  const handleDeleteProduct = (prodId: string) => {
    const raw = getProducts();
    const prod = raw.find((p) => p.id === prodId);
    if (prod) {
      const filtered = raw.filter((p) => p.id !== prodId);
      saveProducts(filtered);

      // Explicitly delete from Firestore
      deleteDocumentFromFirestore('products', prodId);

      logAction('Catalogue Item Purged', `Permanently deleted product: ${prod.name} from branch catalogs.`);
      showToastMsg('Product deleted');
      refreshAllState();
    }
  };

  const handleRestockProduct = (prodId: string, addedQty: number, totalCost: number) => {
    const rawProducts = getProducts();
    const prod = rawProducts.find((p) => p.id === prodId);
    if (prod) {
      prod.stock += addedQty;
      saveProducts(rawProducts);

      // Log invoice replenishment as Operational Overhead Expense
      const rawTxs = getTransactions();
      const replenishTx: Transaction = {
        id: 't_' + Math.random().toString(36).substring(2, 11),
        type: 'expense',
        amount: totalCost,
        bizId: prod.bizId,
        userId: 'admin', // HQ Restock
        time: new Date().toISOString(),
        category: 'Stock',
        details: `Restocked ${addedQty} units of ${prod.name}`,
      };
      rawTxs.push(replenishTx);
      saveTransactions(rawTxs);

      const activeBizName = getBusinesses().find((b) => b.id === prod.bizId)?.name || 'HQ';
      logAction(
        'Inventory Restocked',
        `Requisitioned ${addedQty}x ${prod.name} internally under ${activeBizName}. Authorized procurement cost: KSh ${totalCost.toLocaleString()}.`,
        false,
        prod.bizId
      );

      showToastMsg(`Inventory replenished: +${addedQty} units.`);
      refreshAllState();
    }
  };

  // 4. Team HR Members
  const handleAddTeamMember = (name: string, role: string, bizId: string, phone: string, pin: string, googleEmail?: string, username?: string): boolean => {
    // Check credentials uniqueness
    const dup = checkDuplicateCredentials(undefined, phone, username, googleEmail);
    if (dup.hasDuplicate) {
      showToastMsg(`Failed to add person: ${dup.message}`, true);
      return false; // return failed status
    }

    const raw = getTeam();
    const newMember: TeamMember = {
      id: 'u_' + Math.random().toString(36).substring(2, 11),
      name,
      role,
      bizId,
      status: 'active',
      phone,
      pin,
      googleEmail,
      username,
    };
    raw.push(newMember);
    saveTeam(raw);
    const assignedBiz = getBusinesses().find((b) => b.id === bizId)?.name || 'Floating';
    logAction('Staff Duty Seeded', `Hired ${name} as ${role} assigned directly to register duty under ${assignedBiz}.`);
    showToastMsg(`${name} added to payroll directory.`);
    refreshAllState();
    return true; // return success status
  };

  const handleToggleTeamStatus = (memberId: string) => {
    const raw = getTeam();
    const empl = raw.find((t) => t.id === memberId);
    if (empl) {
      const nextStatus = empl.status === 'active' ? 'suspended' : 'active';
      empl.status = nextStatus;
      saveTeam(raw);

      logAction(
        nextStatus === 'suspended' ? 'Cashier Authorization Revoked' : 'Cashier Access Restored',
        `attendant: ${empl.name} status locks updated to ${nextStatus}.`,
        nextStatus === 'suspended',
        empl.bizId
      );

      showToastMsg(`Staff status: ${empl.name} is now ${nextStatus}`);
      refreshAllState();
    }
  };

  const handleRemoveMember = (memberId: string) => {
    const raw = getTeam();
    const empl = raw.find((t) => t.id === memberId);
    if (empl) {
      const filtered = raw.filter((t) => t.id !== memberId);
      saveTeam(filtered);

      // Explicitly delete from Firestore
      deleteDocumentFromFirestore('team', memberId);

      logAction(
        'Payroll Account Expunged',
        `Permanently removed duty assignments for ${empl.name} (${empl.role}) inside system directory.`,
        true,
        empl.bizId
      );

      showToastMsg(`Staff record purged`);
      refreshAllState();
    }
  };

  const handleCreateEditRequest = (txId: string, proposed: { amount: number; category?: string; details?: string }) => {
    const rawTxs = getTransactions();
    const targetTx = rawTxs.find(t => t.id === txId);
    if (!targetTx) {
      showToastMsg('Target transaction not found.', true);
      return;
    }

    const nextRequests = getEditRequests();
    
    // Check if there is already a pending edit request for this transaction
    const hasPending = nextRequests.some(r => r.txId === txId && r.status === 'pending');
    if (hasPending) {
      showToastMsg('An edit request is already pending for this transaction.', true);
      return;
    }

    const req: LogEditRequest = {
      id: 'req_' + Math.random().toString(36).substring(2, 11),
      txId,
      bizId: targetTx.bizId,
      userId: currentUser?.id || '',
      userName: currentUser?.name || 'Employee',
      originalData: {
        type: targetTx.type,
        amount: targetTx.amount,
        category: targetTx.category,
        details: targetTx.details,
      },
      proposedData: {
        amount: proposed.amount,
        category: proposed.category,
        details: proposed.details,
      },
      status: 'pending',
      time: new Date().toISOString(),
    };

    const updated = [req, ...nextRequests];
    saveEditRequests(updated);
    setEditRequests(updated);
    
    logAction(
      'Edit Request Submitted',
      `Cashier ${currentUser?.name} submitted log edit request for transaction ${txId}. Proposed amount: ${proposed.amount}.`,
      false,
      targetTx.bizId
    );

    showToastMsg('Edit request listed for administrator authorization.');
  };

  const handleResolveEditRequest = (id: string, action: 'accept' | 'reject') => {
    const list = getEditRequests();
    const req = list.find((r) => r.id === id);
    if (!req) return;

    if (action === 'accept') {
      const allTx = getTransactions();
      const updatedTx = allTx.map((tx) => {
        if (tx.id === req.txId) {
          return {
            ...tx,
            amount: req.proposedData.amount,
            category: req.proposedData.category || tx.category,
            details: req.proposedData.details || tx.details,
          };
        }
        return tx;
      });
      saveTransactions(updatedTx);
      setTransactions(updatedTx);

      req.status = 'accepted';
      logAction(
        'Edit Request Approved',
        `Admin accepted log edit request by employee ${req.userName} for transaction ${req.txId}. Updated amount KSh ${req.proposedData.amount.toLocaleString()}.`
      );
      showToastMsg('Edit request accepted. Transaction log updated.');
    } else {
      req.status = 'rejected';
      logAction(
        'Edit Request Rejected',
        `Admin rejected log edit request by employee ${req.userName} for transaction ${req.txId}.`
      );
      showToastMsg('Edit request rejected.');
    }

    const nextRequests = list.map((r) => (r.id === id ? { ...r, status: req.status } : r));
    saveEditRequests(nextRequests);
    setEditRequests(nextRequests);
  };

  // --- VIEW ROUTERS ---

  return (
    <div id="app" className="min-h-screen bg-[#f8fafc] text-slate-905 w-full flex flex-col relative antialiased">
      {/* Toast Overlay */}
      {toast && (
        <div
          id="toast"
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] text-white px-6 py-3.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-3 animate-fade-in border ${
            toast.isError ? 'bg-rose-900 border-rose-500' : 'bg-slate-900 border-slate-700'
          }`}
        >
          {toast.isError ? <AlertCircle className="w-5 h-5 text-rose-300" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Standard Minimal Login Gateway OR Forgot Password Recovery */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col justify-center items-center px-4 bg-[#f8fafc] w-full min-h-screen py-12">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            
            {/* Header / Logo */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-slate-950/10">
                <BarChart2 className="text-white w-6 h-6 shrink-0" />
              </div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{enterpriseName}</h1>
              <p className="text-slate-400 text-xs mt-1">
                {isForgotMode ? 'Reset your password' : 'Sign in to continue'}
              </p>
            </div>

            {!isForgotMode ? (
              /* A. Primary Login Form with Google & Credentials options */
              <div className="space-y-4">
                {/* Google Sign-In secure authentication button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200/70 hover:bg-slate-100 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm transition active:scale-98 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z" fill="#FBBC05" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                {/* Or Divider */}
                <div className="flex items-center gap-2.5 py-1">
                  <div className="flex-1 h-px bg-slate-100"></div>
                  <span className="text-[10px] text-slate-400 capitalize">or</span>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <form onSubmit={handlePhoneLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Username, Phone, or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full border border-slate-200/80 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition"
                      placeholder="e.g. admin, name@gmail.com, or phone"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-medium text-slate-500">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(true);
                          setResetPhone(loginPhone);
                          setResetStep('phone');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-900 transition-colors cursor-pointer block"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      className="w-full border border-slate-200/80 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition"
                      placeholder="Password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition active:scale-98 cursor-pointer shadow-md shadow-slate-900/5 mt-2"
                  >
                    Sign In
                  </button>
                </form>
              </div>
            ) : (
              /* B. Password Recovery / Challenge-Response reset flow */
              <div>
                {resetStep === 'phone' ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-4 text-center leading-relaxed font-sans">
                        Enter your registered Username, Google Email, or Account Name to find your account.
                      </p>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">
                        Username / Google Email / Name
                      </label>
                      <input
                        type="text"
                        required
                        value={resetPhone}
                        onChange={(e) => setResetPhone(e.target.value)}
                        className="w-full border border-slate-200/80 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition"
                        placeholder="Enter username, email, or name"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-950 text-white py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition active:scale-98 cursor-pointer shadow-md mt-2"
                    >
                      Verify Identity
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsForgotMode(false)}
                      className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-700 py-1 transition cursor-pointer mt-2"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmResetPin} className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-4 text-center leading-relaxed">
                        Authorize by entering the registered mobile phone number associated with your account.
                      </p>
                      
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Confirm Registered Mobile Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value)}
                            className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition"
                            placeholder="e.g. 0712345678"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="w-full border border-slate-200 px-4 py-2.5 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium transition"
                            placeholder="New Password"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-950 text-white py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition active:scale-98 cursor-pointer shadow-md mt-2"
                    >
                      Update Password &amp; Log In
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetStep('phone')}
                      className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-700 py-1 transition cursor-pointer mt-2"
                    >
                      Back
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      ) : currentUser.role === 'owner' ? (
        // 2. OWNER COMMAND SHEETS VIEW
        <div className="min-h-screen flex flex-col md:flex-row w-full bg-[#f8fafc] overflow-x-hidden">
          {/* Sidebar Components Navigation */}
          <Sidebar
            currentTab={ownerTab}
            setTab={setOwnerTab}
            expanded={sidebarExpanded}
            setExpanded={setSidebarExpanded}
            currentUser={currentUser}
            logout={handleLogout}
          />

          {/* Core Content Layout Area */}
          <div className="flex-1 flex flex-col pb-28 md:pb-0 overflow-y-auto min-h-screen">
            {/* Mobile Header elements */}
            <div className="md:hidden bg-white/70 backdrop-blur-md px-6 py-3 border-b border-slate-200/40 flex justify-between items-center sticky top-0 z-30 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                  <BarChart2 className="text-white w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 leading-none tracking-tight">{enterpriseName}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cabinet</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Quick Logs Link */}
                <button
                  onClick={() => setOwnerTab('logs')}
                  className={`p-2.5 rounded-xl transition cursor-pointer ${
                    ownerTab === 'logs'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Audit Trail Logs"
                >
                  <Activity className="w-4 h-4" />
                </button>
                {/* Active Logout Link */}
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Logout Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dynamic View Injection */}
            <main className="p-4 md:p-6 lg:p-8 xl:p-10 w-full max-w-[1500px] mx-auto animate-fade-in pb-24">
              {ownerTab === 'dashboard' && (
                <OwnerDashboard
                  businesses={businesses}
                  transactions={transactions}
                  logs={logs}
                  setTab={setOwnerTab}
                  currencySymbol={currencySymbol}
                />
              )}
              {ownerTab === 'analytics' && (
                <OwnerAnalytics
                  businesses={businesses}
                  transactions={transactions}
                  team={team}
                  onShowToast={showToastMsg}
                  currencySymbol={currencySymbol}
                />
              )}
              {ownerTab === 'businesses' && (
                <OwnerBranches
                  businesses={businesses}
                  products={products}
                  onAddBranch={handleAddBranch}
                  onEditBranch={handleEditBranch}
                  onDeleteBranch={handleDeleteBranch}
                  onAddProduct={handleAddProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onRestockProduct={handleRestockProduct}
                  onShowToast={showToastMsg}
                  currencySymbol={currencySymbol}
                  lowStockThreshold={lowStockThreshold}
                />
              )}
              {ownerTab === 'team' && (
                <OwnerTeam
                  team={team}
                  businesses={businesses}
                  transactions={transactions}
                  currencySymbol={currencySymbol}
                  onAddTeamMember={handleAddTeamMember}
                  onToggleStatus={handleToggleTeamStatus}
                  onRemoveMember={handleRemoveMember}
                  onShowToast={showToastMsg}
                />
              )}
              {ownerTab === 'logs' && (
                <OwnerLogs
                  logs={logs}
                  businesses={businesses}
                  editRequests={editRequests}
                  onHandleEditRequest={handleResolveEditRequest}
                />
              )}
            </main>
          </div>

          {/* Interactive Mobile bottom tabbed Nav layout */}
          <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/85 backdrop-blur-md border border-slate-200/40 pb-safe z-40 flex justify-around p-1.5 rounded-full shadow-[0_12px_30px_-6px_rgba(0,0,0,0.12)]">
            {[
              { id: 'dashboard' as OwnerTab, icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'analytics' as OwnerTab, icon: BarChart2, label: 'Analytics' },
              { id: 'businesses' as OwnerTab, icon: Briefcase, label: 'Shops' },
              { id: 'team' as OwnerTab, icon: Users, label: 'Team' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = ownerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setOwnerTab(tab.id)}
                  className={`flex items-center justify-center min-w-0 flex-1 py-3.5 transition-all duration-200 cursor-pointer relative rounded-full ${
                    isActive ? 'text-slate-950 font-bold scale-110' : 'text-slate-400 hover:text-slate-800'
                  }`}
                  title={tab.label}
                >
                  {isActive && (
                    <span className="absolute inset-x-2 inset-y-1.5 bg-slate-900/5 rounded-full -z-10 animate-fade-in" />
                  )}
                  <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // 3. EMPLOYEE / CASHIER WORKSTATION VIEW
        <div className="flex-1 flex flex-col w-full animate-fade-in bg-slate-50 min-h-screen">
          <EmployeeDashboard
            currentUser={
              team.find((t) => t.id === currentUser?.id) || {
                id: currentUser?.id || '',
                name: currentUser?.name || '',
                role: currentUser?.roleTitle || 'attendant',
                bizId: currentUser?.bizId || '',
                status: currentUser?.status || 'active',
                phone: '',
                pin: '',
              }
            }
            businesses={businesses}
            products={products}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onLogout={handleLogout}
            onShowToast={showToastMsg}
            onUpdateProfile={handleUpdateEmployeeProfile}
            onAddProduct={handleAddProduct}
            onCreateEditRequest={handleCreateEditRequest}
            editRequests={editRequests}
          />
        </div>
      )}
    </div>
  );
}
