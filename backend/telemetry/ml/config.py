from .features import selected_features

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

REQUIRED_COLUMNS = ["UTC_Timestamp", *selected_features]

# Global Model Config (Model 1)
GLOBAL_IF_CONTAM = 0.02
GLOBAL_LOF_CONTAM = 0.005
GLOBAL_SVM_NU = 0.01
GLOBAL_VOTE_THRESHOLD = 3

# Feature-Specific Config (Model 2)
FEAT_IF_CONTAM = 0.005
FEAT_LOF_CONTAM = 0.002
FEAT_SVM_NU = 0.005
FEAT_CONSENSUS_THRESHOLD = 3
FEAT_VOTE_THRESHOLD = 3