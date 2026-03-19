from .features import selected_features

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

REQUIRED_COLUMNS = ["UTC_Timestamp", *selected_features]

WEIGHT_IF = 1
WEIGHT_LOF = 1
WEIGHT_SVM = 1
VOTE_THRESHOLD = 2

DEBOUNCE_WINDOW = 7
DEBOUNCE_HITS = 3