import "./StatusCell.css";

interface StatusCellProps {
  getValue: () => unknown;
}

const StatusCell = ({ getValue }: StatusCellProps) => {
  const status = String(getValue() ?? "");

  let statusText;

  if (status === "safe") {
    statusText = "Aman";
  } else if (status === "low") {
    statusText = "Menipis";
  } else if (status === "out") {
    statusText = "Habis";
  } else {
    statusText = "-";
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "safe":
        return "status status-active";

      case "low":
        return "status status-low";

      case "out":
        return "status status-inactive";

      default:
        return "";
    }
  };

  return (
    <span
      className={`statusText rounded-full px-2 py-1 text-sm font-medium ${getStatusClass(
        status,
      )}`}
    >
      {statusText}
    </span>
  );
};

export default StatusCell;