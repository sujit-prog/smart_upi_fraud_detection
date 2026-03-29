import numpy as np
import pandas as pd
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier

np.random.seed(42)

# 1. Generate Data (copied from notebook)
N = 10000
fraud_ratio = 0.07 

user_ids = np.random.choice([f'user_{i}' for i in range(2000)], size=N)
amount = np.round(np.random.lognormal(mean=6, sigma=1.2, size=N), 2)
txn_types = np.random.choice(['P2P', 'merchant', 'recharge', 'bill_payment'], size=N, p=[0.35, 0.45, 0.10, 0.10])
device = np.random.choice(['Android', 'iOS', 'Web'], size=N, p=[0.75, 0.20, 0.05])
merchants = np.random.choice(['grocery', 'utilities', 'electronics', 'entertainment', 'travel', 'others'], size=N, p=[0.25, 0.15, 0.20, 0.10, 0.05, 0.25])
hour = np.random.randint(0, 24, size=N)
transactions_last_24h = np.random.poisson(0.5, size=N)
is_foreign = np.random.choice([0,1], size=N, p=[0.98, 0.02])

base_risk = (amount / (amount.mean()+1)) * 0.3
base_risk += (transactions_last_24h > 3).astype(int) * 0.5
base_risk += (is_foreign==1).astype(int) * 1.0
base_risk += ((txn_types=='merchant') & (merchants=='electronics')).astype(int) * 0.2
base_risk += ((hour < 6) | (hour > 23)).astype(int) * 0.15

base_risk = (base_risk - base_risk.min()) / (base_risk.max() - base_risk.min())
prob_fraud = 0.02 + 0.5 * base_risk
scaling = fraud_ratio / prob_fraud.mean()
prob_fraud = np.clip(prob_fraud * scaling, 0, 0.95)
is_fraud = np.random.binomial(1, prob_fraud)

df = pd.DataFrame({
    'user_id': user_ids,
    'transaction_amount': amount,
    'transaction_type': txn_types,
    'device_type': device,
    'merchant_category': merchants,
    'hour': hour,
    'transactions_last_24h': transactions_last_24h,
    'is_foreign': is_foreign,
    'is_fraud': is_fraud
})

X = df.drop(columns=['is_fraud', 'user_id'])
y = df['is_fraud']

# 2. Build Pipeline
numeric_features = ['transaction_amount', 'hour', 'transactions_last_24h']
cat_features = ['transaction_type', 'device_type', 'merchant_category', 'is_foreign']

numeric_transformer = Pipeline(steps=[('scaler', StandardScaler())])
cat_transformer = Pipeline(steps=[('onehot', OneHotEncoder(handle_unknown='ignore'))])

preprocessor = ColumnTransformer(transformers=[
    ('num', numeric_transformer, numeric_features),
    ('cat', cat_transformer, cat_features)
])

rf_pipeline = Pipeline(steps=[('pre', preprocessor), ('clf', RandomForestClassifier(n_estimators=200, random_state=42))])

print("Training model...")
rf_pipeline.fit(X, y)

# 3. Export
os.makedirs('models', exist_ok=True)
with open('models/fraud_model.pkl', 'wb') as f:
    pickle.dump(rf_pipeline, f)

feature_names = list(X.columns)
with open('models/feature_names.pkl', 'wb') as f:
    pickle.dump(feature_names, f)

print("Exported models/fraud_model.pkl and models/feature_names.pkl successfully!")
