import "./StatusCell.css"

const StatusCell = (info: any) => {
  const status = info.getValue();
  let statusText;
  if (status === 2) statusText = "Stok Tersedia";
  else if (status === 1) statusText = "Stok menipis";
  else statusText = "Stok habis";

  return (
    <div className={`statusText`}>
      {statusText}
    </div>
  );
};

export default StatusCell
