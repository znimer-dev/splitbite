"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Create the schema
const ReceiptSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantName: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true
    },
    restaurantAddress: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    people: [
        {
            id: {
                type: String,
                required: true
            },
            name: {
                type: String,
                required: true,
                trim: true
            },
            email: {
                type: String,
                trim: true
            },
            isRegisteredUser: {
                type: Boolean,
                default: false
            }
        }
    ],
    items: [
        {
            name: {
                type: String,
                required: true,
                trim: true
            },
            quantity: {
                type: Number,
                default: 1,
                min: [1, 'Quantity must be at least 1']
            },
            price: {
                type: Number,
                required: true,
                min: [0, 'Price cannot be negative']
            },
            assignedTo: [{
                    type: String
                }],
            sharedBy: {
                type: Number,
                min: 1
            },
            notes: {
                type: String,
                trim: true
            }
        }
    ],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    tip: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    imageUrl: {
        type: String,
        required: true
    },
    s3Key: {
        type: String,
        required: true
    },
    s3Bucket: {
        type: String,
        required: true
    },
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    ocrConfidence: {
        type: Number,
        min: 0,
        max: 100
    },
    rawTextractData: {
        type: mongoose_1.Schema.Types.Mixed
    },
    splitCalculations: [
        {
            personId: String,
            name: String,
            subtotal: Number,
            taxShare: Number,
            tipShare: Number,
            total: Number,
            items: [
                {
                    itemName: String,
                    fullPrice: Number,
                    shareAmount: Number,
                    sharedWith: [String]
                }
            ]
        }
    ],
    taxDistribution: {
        type: String,
        enum: ['proportional', 'equal'],
        default: 'proportional'
    },
    tipDistribution: {
        type: String,
        enum: ['proportional', 'equal'],
        default: 'proportional'
    },
    isComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
// Add indexes for better query performance
ReceiptSchema.index({ userId: 1, createdAt: -1 });
ReceiptSchema.index({ restaurantName: 'text' });
exports.default = mongoose_1.default.model('Receipt', ReceiptSchema);
