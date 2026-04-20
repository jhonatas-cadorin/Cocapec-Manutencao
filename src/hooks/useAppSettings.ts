import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings } from '../types';

const SETTINGS_DOC_ID = 'global';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'app_settings', SETTINGS_DOC_ID), 
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as AppSettings);
        } else {
          // If settings don't exist, we don't try to set them here for everyone
          // to avoid permission-denied errors for non-admins.
          // We just set local state to defaults.
          setSettings({
            companyName: 'Cocapec',
            allowSelfRegistration: true,
            supportEmail: 'jhonatas.cadorin@gmail.com'
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching app settings:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { settings, loading };
}

export async function updateAppSettings(newSettings: Partial<AppSettings>) {
  const docRef = doc(db, 'app_settings', SETTINGS_DOC_ID);
  await setDoc(docRef, newSettings, { merge: true });
}
