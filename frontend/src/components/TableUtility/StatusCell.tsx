import "./StatusCell.css"

const StatusCell = (info: any) => {
  const status = info.getValue();

  return (
    <div className={`statusText`}>
      {status ? "Stok Tersedia" : "Stok Habis"}
    </div>
  );
};

export default StatusCell
