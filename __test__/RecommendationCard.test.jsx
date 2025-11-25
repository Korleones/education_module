// __tests__/RecommendationCard.test.jsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecommendationCard } from '../app/(tabs)/navigation/rec-system/components/RecommendationCard';

const mockItem = {
  id: 'unit.001',
  kind: 'unit',
  title: 'Physical Sciences — AC9S3U03 — Heat sources & temperature change',
  reason: 'This activity introduces Physical Sciences at a level that suits you.',
  confidence: 0.9, // 会被映射为 high
  payload: {},
};

describe('RecommendationCard', () => {
  it('renders title and confidence label correctly', () => {
    const { getByText } = render(<RecommendationCard item={mockItem} />);

    expect(
      getByText(
        'Physical Sciences — AC9S3U03 — Heat sources & temperature change'
      )
    ).toBeTruthy();

    // 你现在的实现是 high / medium / low 文案
    expect(getByText('Confidence: high')).toBeTruthy();
  });

  it('toggles reason when pressing "Why This?" button', () => {
    const { getByText, queryByText } = render(
      <RecommendationCard item={mockItem} />
    );

    // 初始不显示 reason
    expect(queryByText(mockItem.reason)).toBeNull();

    // 第一次点击 -> 展开 reason
    const button = getByText('Why This?');
    fireEvent.press(button);
    expect(getByText(mockItem.reason)).toBeTruthy();
    expect(getByText('Hide reason')).toBeTruthy();

    // 再次点击 -> 收起 reason 回到 Why This?
    const hideButton = getByText('Hide reason');
    fireEvent.press(hideButton);
    expect(queryByText(mockItem.reason)).toBeNull();
    expect(getByText('Why This?')).toBeTruthy();
  });
});

