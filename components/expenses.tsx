export function Expenses({ expenses = [] }: { expenses: any[] }) {
  return (
    <div className="space-y-8">
      {expenses?.map((expense) => {
        const amountString = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: expense.currency!,
          minimumFractionDigits: 0
        }).format((expense?.amount || 0) / 100);

        return (
          <div className="flex items-center" key={expense.id}>
            {expense.date}
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">
                {expense?.description}
              </p>
              <p className="text-sm text-muted-foreground">{expense?.payee}</p>
            </div>
            <div className="ml-auto font-medium">{amountString}</div>
          </div>
        );
      })}
    </div>
  );
}
