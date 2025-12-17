export const metadata = {
  title: '가격표 인쇄',
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple layout without sidebar/header for print pages
  // Note: Don't include <html> or <body> tags here - they come from root layout
  return <>{children}</>
}
