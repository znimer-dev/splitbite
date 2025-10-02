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
const RestaurantSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    cuisine: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    priceRange: {
        type: String,
        enum: ['budget', 'moderate', 'expensive', 'fine_dining']
    },
    averageRating: {
        type: Number,
        min: 1,
        max: 5
    },
    visitCount: {
        type: Number,
        default: 1,
        min: 0
    },
    totalSpent: {
        type: Number,
        default: 0,
        min: 0
    },
    lastVisit: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isFavorite: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
// Add indexes for better query performance
RestaurantSchema.index({ userId: 1, name: 1 }, { unique: true }); // One restaurant per user
RestaurantSchema.index({ userId: 1, lastVisit: -1 });
RestaurantSchema.index({ userId: 1, isFavorite: 1, visitCount: -1 });
exports.default = mongoose_1.default.model('Restaurant', RestaurantSchema);
