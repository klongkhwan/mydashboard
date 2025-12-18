"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TradeFormNew } from "@/components/trading/trade-form-new"

interface TradeModalProps {
    isOpen: boolean
    onClose: () => void
    tradeId?: string | null
    onSuccess?: () => void
}

export function TradeModal({ isOpen, onClose, tradeId, onSuccess }: TradeModalProps) {
    const isEditMode = !!tradeId

    const handleSuccess = () => {
        onSuccess?.()
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-border bg-background">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogTitle className="text-2xl font-bold text-foreground">
                        บันทึก
                    </DialogTitle>

                </DialogHeader>
                <div className="px-6 pb-6 pt-6">
                    <TradeFormNew
                        tradeId={tradeId || undefined}
                        onTradeCreated={handleSuccess}
                        onTradeUpdated={handleSuccess}
                        onCancel={onClose}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
