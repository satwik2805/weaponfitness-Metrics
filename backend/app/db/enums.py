import enum

class UserRoleEnum(str, enum.Enum):
    Admin = "Admin"
    Owner = "Owner"
    Receptionist = "Receptionist"
    Trainer = "Trainer"
    Trainee = "Trainee"

class PaymentModeEnum(str, enum.Enum):
    Cash = "Cash"
    Card = "Card"
    UPI = "UPI"

class PaymentStatusEnum(str, enum.Enum):
    Completed = "Completed"
    Pending = "Pending"
    Failed = "Failed"

class ReportTypeEnum(str, enum.Enum):
    Weekly = "Weekly"
    Monthly = "Monthly"

class DayEnum(str, enum.Enum):
    monday="monday"
    tuesday="tuesday"
    wednesday="wednesday"
    thursday="thursday"
    friday="friday"
    saturday="saturday"
    sunday="sunday"
