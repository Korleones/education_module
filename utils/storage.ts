import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'selected_student';

/**
 * Save the currently selected student to local storage.
 * @param student - Student object to be saved
 */
export const saveSelectedStudent = async (student: any) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(student));
  } catch (error) {
    console.error('Error saving student:', error);
  }
};

/**
 * Load the currently selected student from local storage.
 * @returns The saved student object, or null if none found
 */
export const loadSelectedStudent = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error loading student:', error);
    return null;
  }
};


