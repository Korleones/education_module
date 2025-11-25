import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DebugPanel } from '../app/(tabs)/navigation/rec-system/components/DebugPanel';

describe('DebugPanel', () => {
  it('shows debug JSON when toggled on', async () => {
    const { getByTestId, getByText } = render(
      <DebugPanel userId="Y3_U1" completedNodeId="EARTH.Y3.AC9S3U02" />
    );


    const switchBtn = getByTestId('debug-switch');
    fireEvent(switchBtn, 'valueChange', true);

 
    await waitFor(() => {
 
      expect(getByText(/Raw JSON output/i)).toBeTruthy();

    
      expect(getByText(/Y3_U1/)).toBeTruthy();
    });
  });
});



