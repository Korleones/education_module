// app/(tabs)/navigation/rec-system/components/DebugPanel.tsx
import React from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import { isDebugMode, setDebugMode } from '../state/debugMode';
import { getUserRawRecs } from '../repo/userRecsRepo';

type Props = {
  userId?: string;
  completedNodeId?: string; // 保留字段，方便以后扩展
};

export const DebugPanel: React.FC<Props> = ({ userId }) => {
  const [debug, setDebug] = React.useState(isDebugMode());
  const [rawJson, setRawJson] = React.useState<any | null>(null);
  const [showJson, setShowJson] = React.useState(false);

  // Debug 打开或学生切换时加载 JSON
  React.useEffect(() => {
    if (!debug || !userId) {
      setRawJson(null);
      return;
    }
    const raw = getUserRawRecs(userId);
    setRawJson(raw ?? null);
  }, [debug, userId]);

  const toggleDebug = (val: boolean) => {
    setDebugMode(val);
    setDebug(val);
    // 关闭 Debug 时顺便收起 JSON
    if (!val) setShowJson(false);
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'flex-end',
      }}
    >
      {/* 顶部开关行 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: debug ? 4 : 0,
        }}
      >
        <Text style={{ marginRight: 8, fontSize: 13 }}>Debug Mode</Text>
        <Switch value={debug} onValueChange={toggleDebug} />
      </View>

      {/* Debug 打开时显示卡片 */}
      {debug && (
        <View
          style={{
            marginTop: 6,
            alignSelf: 'stretch', // 占满整行
          }}
        >
          {/* 卡片外框 */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 3,
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}
          >
            {/* 标题 + Show/Hide JSON 按钮 */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#111827',
                  }}
                >
                  Debug Information
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginTop: 2,
                  }}
                >
                  Raw JSON output for {userId ?? 'N/A'}
                </Text>
              </View>

              <Pressable
                onPress={() => setShowJson((s) => !s)}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  backgroundColor: pressed ? '#e5e7eb' : '#f9fafb',
                })}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: '#111827',
                  }}
                >
                  {showJson ? 'Hide JSON' : 'Show JSON'}
                </Text>
              </Pressable>
            </View>

            {/* 展开的 JSON 内容 */}
            {showJson && (
              <View
                style={{
                  marginTop: 4,
                  maxHeight: 260,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
              >
                {rawJson ? (
                  <ScrollView>
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: '#111827',
                      }}
                    >
                      {JSON.stringify(rawJson, null, 2)}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#9ca3af',
                    }}
                  >
                    No JSON file found for this student.
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};







