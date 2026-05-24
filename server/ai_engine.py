import json
import logging

try:
    import torch
    import torch.nn as nn
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("PyTorch or Scikit-Learn is not installed. AI Engine will run in mock mode.")

if TORCH_AVAILABLE:
    class VolatilityLSTM(nn.Module):
        def __init__(self, input_size=5, hidden_size=64, num_layers=2, output_size=1):
            super(VolatilityLSTM, self).__init__()
            self.hidden_size = hidden_size
            self.num_layers = num_layers
            
            # LSTM layer
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
            
            # Fully connected layer
            self.fc = nn.Linear(hidden_size, output_size)
            self.sigmoid = nn.Sigmoid()

        def forward(self, x):
            # Initialize hidden state and cell state
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            
            # Forward propagate LSTM
            out, _ = self.lstm(x, (h0, c0))
            
            # Decode the hidden state of the last time step
            out = self.fc(out[:, -1, :])
            out = self.sigmoid(out) # Output probability of volatility spike
            return out

class AIEngine:
    def __init__(self):
        if TORCH_AVAILABLE:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
            self.model = VolatilityLSTM().to(self.device)
            self.scaler = MinMaxScaler()
            self.model.eval()

    def prepare_data(self, candles):
        if not TORCH_AVAILABLE or len(candles) < 10:
            return None
            
        df = pd.DataFrame(candles)
        if 'volume' not in df.columns:
            df['volume'] = 1.0
            
        features = df[['open', 'high', 'low', 'close', 'volume']].values
        scaled_features = self.scaler.fit_transform(features)
        
        seq = scaled_features[-10:]
        tensor_seq = torch.FloatTensor(seq).unsqueeze(0).to(self.device)
        return tensor_seq

    def predict_volatility_spike(self, candles):
        if not TORCH_AVAILABLE:
            # Return a mocked volatility probability if torch isn't installed
            import random
            return round(random.uniform(0.1, 0.4), 4)

        tensor_seq = self.prepare_data(candles)
        if tensor_seq is None:
            return 0.15 

        with torch.no_grad():
            prediction = self.model(tensor_seq)
            
        prob = prediction.item()
        return round(prob, 4)

# Singleton instance
ai_engine = AIEngine()
