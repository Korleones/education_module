import {StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View} from 'react-native';
import CareerConstellation from './src/components/CareerConstellation';
import ScrollableCareerSteps from '../../../src/components/ScrollableSteps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState } from 'react';

// 用户数据
const userData = {
    "user_id": "Y3_U1",
    "year": 9,
    "skills_levels": {
        "QP": 7,
        "PC": 6,
        "PAD": 7,
        "EVAL": 6,
        "COMM": 7
    },
    "knowledge_progress": [
        { "node": "PHYSICAL.Y9.AC9S9U03", "level": 2 },
        { "node": "BIO.Y9.AC9S9U01", "level": 3 },
        { "node": "EARTH.Y9.AC9S9U02", "level": 2 },
        { "node": "CHEMICAL.Y9.AC9S9U04", "level": 1 }
    ],
    "career_interests": ["career.045", "career.004", "career.093"]
};

function App() {
    const isDarkMode = useColorScheme() === 'dark';
    // 状态管理：控制显示哪个组件
    const [isShowingSteps, setIsShowingSteps] = useState(false);
    const [currentCareerId, setCurrentCareerId] = useState<string | undefined>();

    // 切换到路径组件
    const handleNavigateToSteps = (careerId: string) => {
        setCurrentCareerId(careerId);
        setIsShowingSteps(true);
    };

    // 返回星座图组件
    const handleNavigateBack = () => {
        setIsShowingSteps(false);
        setCurrentCareerId(undefined);
    };

    return (
        <SafeAreaProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={styles.container}>
                {isShowingSteps ? (
                    // 显示路径组件
                    <View style={styles.stepsContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={handleNavigateBack}>
                            <Text style={styles.backButtonText}>← Return Career Graph</Text>
                        </TouchableOpacity>
                        <ScrollableCareerSteps
                            userId={userData.user_id}
                            initialCareerId={currentCareerId}
                        />
                    </View>
                ) : (
                    // 显示星座图组件
                    <CareerConstellation
                        userId={userData.user_id}
                        userSkills={userData.skills_levels}
                        userKnowledges={{
                            "PHYSICAL.Y9.AC9S9U03": 2,
                            "BIO.Y9.AC9S9U01": 3,
                            "EARTH.Y9.AC9S9U02": 2,
                            "CHEMICAL.Y9.AC9S9U04": 1
                        }}
                        onNavigateToSteps={handleNavigateToSteps}
                        onNavigateBack={handleNavigateBack}
                        isShowingSteps={isShowingSteps}
                        currentCareerId={currentCareerId}
                    />
                )}
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stepsContainer: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    backButton: {
        padding: 12,
        backgroundColor: '#0D47A1',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default App;
