import "./StatusCell.css"

const StatusCell = (info: any) => {
  const status = info.getValue();
  let statusText;
  if (status === 2) statusText = "Stok Aman";
  else if (status === 1) statusText = "Stok menipis";
  else statusText = "Stok habis";

  const getStatusClass = (status: number) => {
    switch (status) {
      case 2:
        return "status status-active";
      case 1:
        return "status status-low";
      case 0:
        return "status status-inactive";
      default:
        return "";
    }
  };

  return (
    <span className={`statusText rounded-full px-3 py-1 text-sm font-medium ` + getStatusClass(status)}>
      {statusText}
    </span>
  );
};

export default StatusCell
