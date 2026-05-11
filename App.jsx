import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout';
import { BuyerGallery } from './components/BuyerGallery';
import { SellerDashboard } from './components/SellerDashboard';
import { LoginPage } from './components/LoginPage';
import { supabase } from './supabaseClient';
import { withRetry } from './src/utils/supabaseRetry';

import './src/i18n'; // تهيئة نظام الترجمات المتعددة

const App = () => {
  const { i18n, t } = useTranslation();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [specialRequests, setSpecialRequests] = useState([]);
  const [settings, setSettings] = useState({
    bank_name: 'المصرف الصحاري',
    account_holder: 'ابوعجيله محمد ابوعجيله',
    account_number: '2005159787',
    iban: 'LY65006035000002005159787',
    phone_number: '0924253894'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const initAuth = async (retryCount = 0) => {
      try {
        const result = await withRetry(async () => await supabase.auth.getSession());
        const { data, error: authError } = result;
        const currentSession = data?.session;
        
        if (authError) {
          if (authError.message?.includes('Lock broken') || authError.message?.includes('stole it')) {
            return;
          }
          throw authError;
        }
        setSession(currentSession || null);
        fetchInitialData();
      } catch (err) {
        const isNetworkError = err.message === 'Failed to fetch' || !window.navigator.onLine;
        if (isNetworkError && retryCount < 2) {
          setTimeout(() => initAuth(retryCount + 1), 2000);
          return;
        }
        fetchInitialData();
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        fetchInitialData(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // تحديث الإعدادات لمرة واحدة في قاعدة البيانات لضمان وجود قيم الحساب الافتراضية للتاجر
  useEffect(() => {
    const ensureSettings = async () => {
      try {
        const { data: existing, error: getError } = await withRetry(async () => 
          await supabase.from('settings').select('*').eq('id', 1).single()
        );
        
        if (getError && getError.code !== 'PGRST116') throw getError;
        
        if (!existing || 
            existing.bank_name !== 'المصرف الصحاري' || 
            existing.account_holder !== 'ابوعجيله محمد ابوعجيله' || 
            existing.account_number !== '2005159787' || 
            existing.phone_number !== '0924253894' ||
            existing.iban !== 'LY65006035000002005159787') {
          
          await withRetry(async () => await supabase.from('settings').upsert([{ 
            id: 1, 
            bank_name: 'المصرف الصحاري', 
            account_holder: 'ابوعجيله محمد ابوعجيله', 
            account_number: '2005159787', 
            phone_number: '0924253894',
            iban: 'LY65006035000002005159787'
          }]));
        }
      } catch (err) {
        console.error("Error setting default account info:", err);
      }
    };
    
    ensureSettings();
  }, []);

  const fetchInitialData = async (silent = false, retryCount = 0) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      const { data: prodData, error: prodError } = await withRetry(async () => 
        await supabase.from('products').select('*').order('created_at', { ascending: false })
      );
      if (prodError) throw prodError;
      if (prodData) setProducts(prodData);

      const { data: orderData, error: orderError } = await withRetry(async () => 
        await supabase.from('orders').select('*').order('timestamp', { ascending: false })
      );
      if (orderError) throw orderError;
      if (orderData) setOrders(orderData);

      const { data: specData, error: specError } = await withRetry(async () => 
        await supabase.from('special_requests').select('*').order('timestamp', { ascending: false })
      );
      if (specError) throw specError;
      if (specData) setSpecialRequests(specData);

      const { data: settsData, error: settsError } = await withRetry(async () => 
        await supabase.from('settings').select('*').eq('id', 1).single()
      );
      if (settsError && settsError.code !== 'PGRST116') throw settsError;
      
      if (settsData) {
        setSettings(prev => ({
          ...prev,
          bank_name: settsData.bank_name || prev.bank_name,
          account_holder: settsData.account_holder || prev.account_holder,
          account_number: settsData.account_number || prev.account_number,
          iban: settsData.iban || prev.iban,
          phone_number: settsData.phone_number || prev.phone_number
        }));
      }
    } catch (err) {
      console.error("Error loading products/settings:", err);
      const isNetworkError = err.message === 'Failed to fetch' || !window.navigator.onLine;
      if (isNetworkError && retryCount < 2) {
        setTimeout(() => fetchInitialData(silent, retryCount + 1), 2000);
        return;
      }
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const addProduct = async (product) => {
    const cleanProduct = Object.fromEntries(
      Object.entries(product).filter(([_, v]) => v !== undefined)
    );
    const { error } = await withRetry(async () => await supabase.from('products').insert([cleanProduct]));
    if (error) {
      alert(`${t('add_work_failed')}: ${error.message}`);
    } else {
      setProducts(prev => [product, ...prev]);
    }
  };

  const deleteProduct = async (id) => {
    const { error } = await withRetry(async () => await supabase.from('products').delete().eq('id', id));
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    else alert(`${t('delete_failed')}: ${error.message}`);
  };

  const addOrder = async (order) => {
    const cleanOrder = Object.fromEntries(
      Object.entries(order).filter(([_, v]) => v !== undefined)
    );
    const { error } = await withRetry(async () => await supabase.from('orders').insert([cleanOrder]));
    if (error) {
      alert(`${t('send_order_failed')}: ${error.message}`);
    } else {
      setOrders(prev => [order, ...prev]);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const order = orders.find(o => o.id === orderId);
      let updates = { status };

      if (status === 'approved' && order && (!order.sale_file_url || order.sale_file_url.trim() === '')) {
        const product = products.find(p => p.id === order.product_id);
        if (product && product.sale_file_url) {
          updates.sale_file_url = product.sale_file_url;
        }
      }

      const { error } = await withRetry(async () => await supabase.from('orders').update(updates).eq('id', orderId));
      if (error) {
        alert(`${t('update_order_status_failed')}: ${error.message}`);
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addSpecialRequest = async (req) => {
    const cleanReq = Object.fromEntries(
      Object.entries(req).filter(([_, v]) => v !== undefined)
    );
    const { error } = await withRetry(async () => await supabase.from('special_requests').insert([cleanReq]));
    if (error) {
      alert(`${t('send_special_request_failed')}: ${error.message}`);
    } else {
      setSpecialRequests(prev => [req, ...prev]);
    }
  };

  const updateSpecialRequest = async (id, updates) => {
    const { error } = await withRetry(async () => await supabase.from('special_requests').update(updates).eq('id', id));
    if (error) {
      alert(`${t('update_request_failed')}: ${error.message}`);
    } else {
      setSpecialRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    }
  };

  const updateSettings = async (newSettings) => {
    const { error } = await withRetry(async () => await supabase.from('settings').upsert([{ id: 1, ...newSettings }]));
    if (error) {
      alert(`${t('save_settings_failed')}: ${error.message}`);
    } else {
      setSettings(newSettings);
      alert(t('settings_saved_success'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 font-black text-black">{t('updating_data')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="text-6xl mb-6">📡</div>
        <h2 className="text-2xl font-black text-gray-800 mb-4">{t('connection_error')}</h2>
        <p className="text-red-600 font-bold mb-8 max-w-md">{error}</p>
        <button 
          onClick={() => fetchInitialData()}
          className="px-8 py-4 bg-black text-white rounded-2xl font-black shadow-xl hover:scale-105 transition active:scale-95"
        >
          {t('retry')} 🔄
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/" 
            element={
              <BuyerGallery 
                products={products} 
                sellerSettings={settings} 
                onPurchase={addOrder}
                onSpecialRequest={addSpecialRequest}
              />
            } 
          />
          <Route 
            path="/login" 
            element={session ? <Navigate to="/seller" /> : <LoginPage />} 
          />
          <Route 
            path="/seller/*" 
            element={
              session ? (
                <SellerDashboard 
                  products={products} 
                  orders={orders} 
                  specialRequests={specialRequests}
                  settings={settings}
                  session={session}
                  onAddProduct={addProduct}
                  onDeleteProduct={deleteProduct}
                  onUpdateOrder={updateOrderStatus}
                  onUpdateSettings={updateSettings}
                  onUpdateSpecialRequest={updateSpecialRequest}
                  onRefresh={() => fetchInitialData(true)}
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
