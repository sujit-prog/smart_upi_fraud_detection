import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os
import numpy as np

# --- 1. Create Dummy Data ---
# Let's generate some sample transaction data.
# In a real project, you would load this from a CSV or a database.
data = {
    'amount': np.random.randint(100, 50000, 1000),
    'device_id_risk': np.random.randint(0, 10, 1000), # A score for how risky the device is
    'is_new_beneficiary': np.random.randint(0, 2, 1000), # 1 if new, 0 if not
    'is_fraud': np.random.randint(0, 2, 1000) # 1 for fraud, 0 for not fraud
}
df = pd.DataFrame(data)

# Make the data slightly more realistic (fraud usually involves higher amounts)
df.loc[df['is_fraud'] == 1, 'amount'] *= 1.5

# --- 2. Prepare Data and Train Model ---
X = df[['amount', 'device_id_risk', 'is_new_beneficiary']]
y = df['is_fraud']

# Scale the features for better performance
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split data and train a simple model
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
model = LogisticRegression()
model.fit(X_train, y_train)

print(f"Model trained with an accuracy of: {model.score(X_test, y_test):.2f}")

# --- 3. Save the Model and the Scaler ---
# Create the 'models' directory if it doesn't exist
os.makedirs('models', exist_ok=True)

# Save the trained model to a file inside the 'models' folder
model_path = 'models/fraud_detection_model.pkl'
joblib.dump(model, model_path)

# It's also crucial to save the scaler to process new data the same way
scaler_path = 'models/scaler.pkl'
joblib.dump(scaler, scaler_path)

print(f"✅ Model saved to: {model_path}")
print(f"✅ Scaler saved to: {scaler_path}")