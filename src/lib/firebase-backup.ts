"use server";

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { StartTaskRecord, EndTaskRecord } from '@/lib/definitions';
import { errorLogger } from '@/lib/error-logger';

// Initialize Firebase Admin (server-side only)
if (!getApps().length) {
  // For production, use service account from environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'acpl-efficiency-db'
    });
  } else {
    // For development, initialize without credentials (will use default)
    initializeApp({
      projectId: 'acpl-efficiency-db'
    });
  }
}

const db = getFirestore();

/**
 * Backup task start to Firebase
 */
export async function backupTaskStart(data: StartTaskRecord & { timestamp: string }) {
  try {
    const docRef = db.collection('tasks').doc();
    await docRef.set({
      ...data,
      type: 'start',
      status: 'active',
      createdAt: new Date().toISOString(),
      syncedToSheet: true
    });
    
    console.log('✅ Task start backed up to Firebase:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    errorLogger.error('Failed to backup task start to Firebase', error, 'backupTaskStart');
    return { success: false, error: 'Firebase backup failed' };
  }
}

/**
 * Backup task end to Firebase
 */
export async function backupTaskEnd(employeeName: string, data: EndTaskRecord & { taskName: string; timestamp: string }) {
  try {
    // Find the active task for this employee
    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef
      .where('employeeName', '==', employeeName)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const taskDoc = snapshot.docs[0];
      await taskDoc.ref.update({
        endTime: data.endTime,
        endRemarks: data.remarks,
        status: 'completed',
        completedAt: new Date().toISOString(),
        syncedToSheet: true
      });
      
      console.log('✅ Task end backed up to Firebase:', taskDoc.id);
      return { success: true, id: taskDoc.id };
    } else {
      // Create new document if not found
      const docRef = db.collection('tasks').doc();
      await docRef.set({
        employeeName,
        taskName: data.taskName,
        endTime: data.endTime,
        endRemarks: data.remarks,
        type: 'end',
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        syncedToSheet: true
      });
      
      console.log('✅ Task end backed up to Firebase (new doc):', docRef.id);
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    errorLogger.error('Failed to backup task end to Firebase', error, 'backupTaskEnd');
    return { success: false, error: 'Firebase backup failed' };
  }
}

/**
 * Get all tasks from Firebase for an employee
 */
export async function getTasksFromFirebase(employeeName: string, startDate: Date, endDate: Date) {
  try {
    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef
      .where('employeeName', '==', employeeName)
      .where('createdAt', '>=', startDate.toISOString())
      .where('createdAt', '<=', endDate.toISOString())
      .orderBy('createdAt', 'asc')
      .get();
    
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, tasks };
  } catch (error) {
    errorLogger.error('Failed to get tasks from Firebase', error, 'getTasksFromFirebase');
    return { success: false, tasks: [] };
  }
}

/**
 * Sync Google Sheet data to Firebase (bulk backup)
 */
export async function syncSheetToFirebase(employeeName: string, tasks: any[]) {
  try {
    const batch = db.batch();
    
    tasks.forEach(task => {
      const docRef = db.collection('tasks').doc();
      batch.set(docRef, {
        ...task,
        employeeName,
        syncedAt: new Date().toISOString(),
        source: 'google_sheet'
      });
    });
    
    await batch.commit();
    console.log(`✅ Synced ${tasks.length} tasks to Firebase for ${employeeName}`);
    return { success: true, count: tasks.length };
  } catch (error) {
    errorLogger.error('Failed to sync sheet to Firebase', error, 'syncSheetToFirebase');
    return { success: false, error: 'Sync failed' };
  }
}
