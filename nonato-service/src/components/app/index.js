// Peças visuais partilhadas do backoffice (novo design).
// Usar estas em vez de construir cabeçalhos, cartões de números, pesquisa,
// estados e confirmações à mão em cada página.

export { default as PageHeader } from "./PageHeader.jsx";
export { StatCard, StatGrid } from "./StatCard.jsx";
export { FilterBar, SearchInput } from "./FilterBar.jsx";
export { EmptyState, PageLoader, Skeleton, CardGridSkeleton } from "./States.jsx";
export { ConfirmDialog, ConfirmProvider, useConfirm } from "./Confirm.jsx";
export { FormSection, Field, FieldGrid, InputField } from "./Form.jsx";
export { Fab, LoadMoreButton } from "./Actions.jsx";
export { default as StatusBadge } from "./StatusBadge.jsx";
