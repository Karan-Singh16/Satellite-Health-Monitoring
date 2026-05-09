from .features import selected_features

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

REQUIRED_COLUMNS = ["UTC_Timestamp", *selected_features]

# Global Model Config (Model 1) — parameters match Improved ml model.ipynb
GLOBAL_IF_N_ESTIMATORS = 100
GLOBAL_IF_CONTAM = 0.02
GLOBAL_LOF_N_NEIGHBORS = 250
GLOBAL_LOF_CONTAM = 0.005
GLOBAL_SVM_NU = 0.01
GLOBAL_VOTE_THRESHOLD = 3        # all 3 must agree (unanimous)

# Feature-Specific Config (Model 2) — parameters match Improved ml model.ipynb
FEAT_IF_N_ESTIMATORS = 50
FEAT_IF_CONTAM = 0.005
FEAT_LOF_N_NEIGHBORS = 150
FEAT_LOF_CONTAM = 0.002
FEAT_SVM_NU = 0.005
FEAT_CONSENSUS_THRESHOLD = 2     # 2-of-3 models must agree per sensor (matches notebook)
FEAT_VOTE_THRESHOLD = 3          # 3+ sensors must trigger